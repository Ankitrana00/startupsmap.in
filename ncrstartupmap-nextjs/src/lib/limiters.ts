/**
 * Unified rate-limiting service (consolidates create-limiter + middleware/rate-limit).
 *
 * Single source of truth for rate limiting across the application. Produces
 * limiters that enforce quotas against Redis (Upstash HTTP) when configured and
 * fall back to bounded in-memory Maps in dev/test/redis-down environments.
 *
 * Usage
 *   import { createLimiter } from "@/lib/limiters";
 *   const limiter = createLimiter(5, 60_000); // 5 requests per 60s per IP
 *   if (!(await limiter.check(ip))) {
 *     const retryAfter = await limiter.retryAfterSeconds(ip);
 *     return NextResponse.json({ error: "..." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
 *   }
 */

import { getRedisClient, isRedisConfigured } from "@/lib/cache/redis";
import { log } from "@/lib/logging/logger";

/** Factory shape returned by {@link createLimiter}. */
export interface RateLimiter {
  /** Returns `true` if the request is within quota; `false` once rate-limited. */
  check(ip: string): Promise<boolean>;
  /**
   * Whole-second cooldown remaining on the current IP window.
   * Returns `0` when the IP has no active bucket or the window has expired.
   */
  retryAfterSeconds(ip: string): Promise<number>;
}

/** Per-IP bucket stored in the in-memory fallback. */
interface MemoryBucket {
  start: number;
  count: number;
}

/** Maximum distinct IPs tracked by a single in-memory limiter before eviction kicks in. */
const MAX_MEMORY_IPS = 10_000;

/**
 * Build a rate limiter for the given quota and window.
 *
 * Two limiters with different `(limit, windowMs)` arguments maintain independent
 * Redis key spaces and independent in-memory buckets, so they can coexist
 * (e.g. a strict 5/min submit limiter alongside a looser 100/min general limiter).
 *
 * @param limit - Max requests per window per IP.
 * @param windowMs - Window duration in milliseconds.
 * @param namespace - Stable identifier for this limiter's endpoint/route. Included
 *   in the Redis key to prevent collisions when multiple limiters share the same
 *   `(limit, windowMs)` values (e.g. admin verification vs. startup write both
 *   using 30/60000). Use lowercase alphanumeric + hyphens (e.g. "submit", "admin-verify").
 */
export function createLimiter(
  limit: number,
  windowMs: number,
  namespace: string,
): RateLimiter {
  const memoryBuckets = new Map<string, MemoryBucket>();

  /**
   * In-memory check. Shared by both `check` and `retryAfterSeconds` so the
   * window semantics are identical regardless of which path runs.
   */
  function memoryCheck(ip: string): MemoryBucket | null {
    const now = Date.now();
    const bucket = memoryBuckets.get(ip);

    if (!bucket || now - bucket.start > windowMs) {
      const newBucket: MemoryBucket = { start: now, count: 0 };
      memoryBuckets.set(ip, newBucket);
      return newBucket;
    }

    return bucket;
  }

  /**
   * Evict expired buckets when the map grows too large. Called at the start of
   * each check so a flood of unique IPs cannot exhaust memory.
   */
  function maybeEvictExpired(): void {
    if (memoryBuckets.size <= MAX_MEMORY_IPS) return;
    const now = Date.now();
    for (const [ip, bucket] of memoryBuckets) {
      if (now - bucket.start > windowMs) memoryBuckets.delete(ip);
    }
  }

  /**
   * Redis key namespace derived from the quota config and route namespace so
   * distinct limiters never collide. Only used when Redis is configured.
   * Format: rl:<namespace>:<limit>:<windowMs>
   */
  const redisKeyPrefix = `rl:${namespace}:${limit}:${windowMs}`;

  return {
    async check(ip: string): Promise<boolean> {
      maybeEvictExpired();

      if (isRedisConfigured()) {
        try {
          const store = getRedisClient();
          const key = `${redisKeyPrefix}:${ip}`;
          const current = await store.get(key);
          const now = Date.now();

          if (!current) {
            await store.set(
              key,
              JSON.stringify({ start: now, count: 1 }),
              Math.ceil(windowMs / 1000),
            );
            return true;
          }

          const bucket: MemoryBucket = JSON.parse(current);
          if (now - bucket.start > windowMs) {
            await store.set(
              key,
              JSON.stringify({ start: now, count: 1 }),
              Math.ceil(windowMs / 1000),
            );
            return true;
          }

          if (bucket.count >= limit) return false;
          bucket.count += 1;
          await store.set(
            key,
            JSON.stringify(bucket),
            Math.ceil((windowMs - (now - bucket.start)) / 1000),
          );
          return true;
        } catch {
          log.warn("[createLimiter] Redis check failed, using in-memory fallback", {
            windowMs,
            limit,
            ip,
          });
          // Degraded path: fall through to the bounded in-memory check below.
        }
      }

      const bucket = memoryCheck(ip);
      if (!bucket) return true;
      // count === 0 marks a freshly-created window (first request). Mirror the
      // Redis path: seed the bucket to count=1 and allow the request.
      if (bucket.count === 0) {
        bucket.count = 1;
        return true;
      }
      if (bucket.count >= limit) return false;
      bucket.count += 1;
      return true;
    },

    async retryAfterSeconds(ip: string): Promise<number> {
      maybeEvictExpired();

      if (isRedisConfigured()) {
        try {
          const current = await getRedisClient().get(`${redisKeyPrefix}:${ip}`);
          if (current) {
            const bucket: MemoryBucket = JSON.parse(current);
            const remaining = windowMs - (Date.now() - bucket.start);
            return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
          }
          return 0;
        } catch {
          log.warn("[createLimiter] Redis retry-after read failed, using in-memory fallback", {
            windowMs,
            limit,
            ip,
          });
        }
      }

      const bucket = memoryBuckets.get(ip);
      if (!bucket) return 0;
      const elapsed = Date.now() - bucket.start;
      const remaining = windowMs - elapsed;
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    },
  };
}