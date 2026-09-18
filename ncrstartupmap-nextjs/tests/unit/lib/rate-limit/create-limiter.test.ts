import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit/create-limiter";

/**
 * H3 coverage: createRateLimiter returns { check, retryAfterSeconds }.
 * retryAfterSeconds must report the wall-clock seconds remaining in an IP's
 * current window (so API routes can emit Retry-After headers).
 */

describe("createRateLimiter — H3 (Retry-After)", () => {
  it("returns an object with check() and retryAfterSeconds() methods", () => {
    const limiter = createRateLimiter(5, 60_000);
    expect(typeof limiter.check).toBe("function");
    expect(typeof limiter.retryAfterSeconds).toBe("function");
  });

  it("returns >0 retryAfterSeconds while inside an active window", () => {
    const limiter = createRateLimiter(1, 60_000);
    // First call creates the bucket.
    expect(limiter.check("1.2.3.4")).toBe(true);
    const remaining = limiter.retryAfterSeconds("1.2.3.4");
    // Window is 60s; we just started, so remaining should be ~60s (allow a
    // second of jitter from Date.now() between the two calls).
    expect(remaining).toBeGreaterThanOrEqual(58);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it("returns 0 retryAfterSeconds for an IP with no bucket", () => {
    const limiter = createRateLimiter(5, 60_000);
    expect(limiter.retryAfterSeconds("9.9.9.9")).toBe(0);
  });

  it("check() returns false once limit is exceeded", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check("1.1.1.1")).toBe(true); // count=1
    expect(limiter.check("1.1.1.1")).toBe(true); // count=2
    expect(limiter.check("1.1.1.1")).toBe(false); // over limit
    // Still reports remaining time on the bucket.
    expect(limiter.retryAfterSeconds("1.1.1.1")).toBeGreaterThan(0);
  });
});
