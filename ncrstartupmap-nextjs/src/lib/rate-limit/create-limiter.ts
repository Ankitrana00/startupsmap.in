import { getRedisClient, isRedisConfigured } from "@/lib/cache/redis";

/**
 * Shared rate limiter factory (P1-3, audit H4/H5).
 *
 * Production: counters live in Redis (via the shared client in
 * lib/cache/redis.ts) so quotas are enforced across all serverless
 * instances — per-process Maps multiplied the brute-force budget by the
 * instance count. Dev / no-Redis: identical in-memory fallback, so local
 * boot and unit tests need no Redis.
 *
 * The public surface is now async (check / retryAfterSeconds return
 * Promises) — call sites await both.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const MAX_TRACKED_IPS = 10_000;

  /** Single bucket per IP — window start + request count together. */
  const buckets = new Map<string, { start: number; count: number }>();

  async function memoryCheck(ip: string): Promise<boolean> {
    const now = Date.now();

    // Bound memory: when tracking too many IPs, drop expired windows.
    if (buckets.size > MAX_TRACKED_IPS) {
      for (const [key, bucket] of buckets) {
        if (now - bucket.start > windowMs) {
          buckets.delete(key);
        }
      }
    }

    const bucket = buckets.get(ip);
    if (!bucket || now - bucket.start > windowMs) {
      buckets.set(ip, { start: now, count: 1 });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }

  return {
    /**
     * Returns true if the request is within quota; false once rate-limited.
     * When rate-limited, `retryAfterSeconds()` yields the wall-clock seconds
     * remaining in the current window (so the caller can send Retry-After).
     */
    async check(ip: string): Promise<boolean> {
      if (isRedisConfigured()) {
        try {
          const store = getRedisClient();
          const key = `rl:${windowMs}:${ip}`;
          const current = await store.get(key);
          const now = Date.now();

          if (!current) {
            await store.set(key, JSON.stringify({ start: now, count: 1 }), Math.ceil(windowMs / 1000));
            return true;
          }

          const bucket = JSON.parse(current) as { start: number; count: number };
          if (now - bucket.start > windowMs) {
            await store.set(key, JSON.stringify({ start: now, count: 1 }), Math.ceil(windowMs / 1000));
            return true;
          }
          if (bucket.count >= limit) return false;
          bucket.count += 1;
          await store.set(key, JSON.stringify(bucket), Math.ceil((windowMs - (now - bucket.start)) / 1000));
          return true;
        } catch {
          // Redis unavailable — degrade to in-memory rather than failing open.
        }
      }
      return memoryCheck(ip);
    },

    /** Whole-second cooldown remaining on the current IP window (0 if none). */
    async retryAfterSeconds(ip: string): Promise<number> {
      if (isRedisConfigured()) {
        try {
          const current = await getRedisClient().get(`rl:${windowMs}:${ip}`);
          if (current) {
            const bucket = JSON.parse(current) as { start: number };
            const remaining = windowMs - (Date.now() - bucket.start);
            return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
          }
          return 0;
        } catch {
          // fall through to memory
        }
      }
      const bucket = buckets.get(ip);
      if (!bucket) return 0;
      const elapsed = Date.now() - bucket.start;
      const remaining = windowMs - elapsed;
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    },
  };
}
