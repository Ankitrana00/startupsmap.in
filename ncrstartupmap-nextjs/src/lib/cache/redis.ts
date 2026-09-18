type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
};

const memoryCache = new Map<string, { value: string; expires: number }>();

let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    // Simple in-memory cache as fallback
    redisClient = {
      async get(key: string): Promise<string | null> {
        const entry = memoryCache.get(key);
        if (entry && entry.expires > Date.now()) {
          return entry.value;
        }
        memoryCache.delete(key);
        return null;
      },
      async set(key: string, value: string, ttl?: number): Promise<void> {
        const expires = ttl ? Date.now() + ttl * 1000 : Infinity;
        memoryCache.set(key, { value, expires });
      },
      async del(key: string): Promise<void> {
        memoryCache.delete(key);
      },
    };
  }
  return redisClient;
}
