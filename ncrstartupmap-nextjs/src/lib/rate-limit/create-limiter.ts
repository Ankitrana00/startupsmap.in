/**
 * Shared in-memory rate limiter factory. One implementation, instantiated
 * per endpoint so each flow gets an independent quota (submit: 5/h,
 * promote: 3/h) without sharing buckets.
 *
 * H3: the factory now also reports how many seconds remain in the current
 * window (retryAfterSeconds) so API routes can emit a `Retry-After` header
 * and callers can show a cooldown to the user instead of a flat "try later".
 *
 * KNOWN PRODUCTION LIMITATION (documented, accepted for dev): state is
 * per-process — multi-instance/serverless deployments get per-instance
 * limits, and restarts reset quotas. Replace the backing store with Redis
 * (e.g. Upstash) behind this same factory interface later; call sites and
 * per-endpoint quotas stay unchanged.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const MAX_TRACKED_IPS = 10_000;

  /** Single bucket per IP — window start + request count together. */
  const buckets = new Map<string, { start: number; count: number }>();

  return {
    /**
     * Returns true if the request is within quota; false once rate-limited.
     * When rate-limited, `retryAfterSeconds()` yields the wall-clock seconds
     * remaining in the current window (so the caller can send Retry-After).
     */
    check(ip: string): boolean {
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
    },

    /** Whole-second cooldown remaining on the *current* IP's window (0 if none/blocked window elapsed). */
    retryAfterSeconds(ip: string): number {
      const bucket = buckets.get(ip);
      if (!bucket) return 0;
      const elapsed = Date.now() - bucket.start;
      const remaining = windowMs - elapsed;
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    },
  };
}