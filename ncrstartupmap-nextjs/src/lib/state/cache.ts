interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MAX_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_SIZE = 100;

class SimpleCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > MAX_AGE) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: K, data: V): void {
    if (this.cache.size >= MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const startupCache = new SimpleCache<string, unknown>();
export type { SimpleCache };
