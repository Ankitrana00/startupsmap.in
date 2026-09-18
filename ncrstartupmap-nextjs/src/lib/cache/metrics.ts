interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  evictions: 0,
};

export function recordHit(): void {
  metrics.hits++;
}

export function recordMiss(): void {
  metrics.misses++;
}

export function recordEviction(): void {
  metrics.evictions++;
}

export function getMetrics(): CacheMetrics {
  return { ...metrics };
}
