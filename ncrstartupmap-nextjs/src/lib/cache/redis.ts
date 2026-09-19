/**
 * Shared cache/deny-list store (P1-2, P1-3).
 *
 * Production (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set): real
 * Redis via the
 * official @upstash/redis client — serverless-friendly HTTP transport, no
 * TCP pool. Dev / test (nothing set): bounded in-memory fallback with the
 * identical interface, so local boot needs no Redis.
 * Also the backing store for P3-1 idempotency keys and the P3-2 startup list
 * cache. REDIS_HOST / REDIS_PORT / REDIS_PASSWORD are NOT read anywhere - the
 * Upstash HTTP client is the only Redis transport (see .env.example).
 */
import { Redis as UpstashRedis } from "@upstash/redis";

export type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  /**
   * P3-1: SET-if-absent with TTL (atomic). Returns true when this caller
   * created the key (it is the first), false when it already existed. Used to
   * claim idempotency keys without a racy get-then-set.
   */
  setnx: (key: string, value: string, ttl?: number) => Promise<boolean>;
};

const upstashUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const upstashToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

/** True when a real Redis backend is configured (prod). */
export function isRedisConfigured(): boolean {
  return Boolean(upstashUrl && upstashToken);
}

const upstash: UpstashRedis | null = isRedisConfigured()
  ? new UpstashRedis({ url: upstashUrl, token: upstashToken })
  : null;

/**
 * In-memory fallback — bounded so a flood of unique keys cannot exhaust
 * memory (audit H5: the previous csrf.ts Map was unbounded).
 */
const memoryStore = new Map<string, { value: string; expires: number }>();
const MAX_MEMORY_KEYS = 10_000;

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expires !== Infinity && entry.expires <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds?: number): void {
  if (memoryStore.size >= MAX_MEMORY_KEYS && !memoryStore.has(key)) {
    // Evict the oldest entry (Map preserves insertion order).
    const oldest = memoryStore.keys().next().value;
    if (oldest !== undefined) memoryStore.delete(oldest);
  }
  memoryStore.set(key, {
    value,
    expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity,
  });
}

/**
 * The single store handle. Never returns null — callers get either the
 * Upstash client or the in-memory fallback with the same methods.
 */
export function getRedisClient(): RedisClient {
  if (upstash) {
    return {
      async get(key) {
        const value = await upstash.get(key);
        return typeof value === "string" ? value : null;
      },
      async set(key, value, ttl) {
        if (ttl) {
          await upstash.set(key, value, { ex: ttl });
        } else {
          await upstash.set(key, value);
        }
      },
      async setnx(key, value, ttl) {
        // Upstash's option type requires `ex` to be a definite number when
        // present, so build the object conditionally instead of passing
        // `ex: undefined`.
        const options = ttl ? ({ nx: true, ex: ttl } as const) : ({ nx: true } as const);
        const result = (await upstash.set(key, value, options)) as unknown;
        // Upstash returns null when the NX condition failed (key existed).
        return result !== null;
      },
      async del(key) {
        await upstash.del(key);
      },
    };
  }

  return {
    async get(key) {
      return memoryGet(key);
    },
    async set(key, value, ttl) {
      memorySet(key, value, ttl);
    },
    async setnx(key, value, ttl) {
      if (memoryGet(key) !== null) return false;
      memorySet(key, value, ttl);
      return true;
    },
    async del(key) {
      memoryStore.delete(key);
    },
  };
}
