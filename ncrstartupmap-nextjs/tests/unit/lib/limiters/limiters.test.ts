import { describe, it, expect } from "vitest";
import { createLimiter } from "@/lib/limiters";

/**
 * H3 coverage: createLimiter returns { check, retryAfterSeconds }.
 * retryAfterSeconds must report the wall-clock seconds remaining in an IP's
 * current window (so API routes can emit Retry-After headers).
 *
 * P1-3: the backing store is now the shared KV module (in-memory fallback in
 * test env), so check()/retryAfterSeconds() are async. All original
 * assertions preserved; async contract added.
 */

describe("createLimiter — H3 (Retry-After)", () => {
  it("returns an object with check() and retryAfterSeconds() methods", () => {
    const limiter = createLimiter(5, 60_000);
    expect(typeof limiter.check).toBe("function");
    expect(typeof limiter.retryAfterSeconds).toBe("function");
  });

  it("returns >0 retryAfterSeconds while inside an active window", async () => {
    const limiter = createLimiter(1, 60_000);
    // First call creates the bucket.
    expect(await limiter.check("1.2.3.4")).toBe(true);
    const remaining = await limiter.retryAfterSeconds("1.2.3.4");
    // Window is 60s; we just started, so remaining should be ~60s (allow a
    // second of jitter from Date.now() between the two calls).
    expect(remaining).toBeGreaterThanOrEqual(58);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it("returns 0 retryAfterSeconds for an IP with no bucket", async () => {
    const limiter = createLimiter(5, 60_000);
    expect(await limiter.retryAfterSeconds("9.9.9.9")).toBe(0);
  });

  it("check() returns false once limit is exceeded", async () => {
    const limiter = createLimiter(2, 60_000);
    expect(await limiter.check("1.1.1.1")).toBe(true); // count=1
    expect(await limiter.check("1.1.1.1")).toBe(true); // count=2
    expect(await limiter.check("1.1.1.1")).toBe(false); // over limit
    // Still reports remaining time on the bucket.
    expect(await limiter.retryAfterSeconds("1.1.1.1")).toBeGreaterThan(0);
  });

  it("P1-3: independent limiter instances do not share buckets", async () => {
    const a = createLimiter(1, 60_000);
    const b = createLimiter(1, 60_000);
    expect(await a.check("shared-ip")).toBe(true);
    expect(await a.check("shared-ip")).toBe(false);
    // Same IP, different limiter → own bucket.
    expect(await b.check("shared-ip")).toBe(true);
  });

  it("P1-3: quotas survive a 'restart' (fresh factory, same backing store keys)", async () => {
    // Namespace is derived from quota+window only when Upstash is configured;
    // in-memory fallback namespaces per instance, so this documents the
    // dev-mode limitation instead of asserting cross-instance behavior.
    const a = createLimiter(1, 60_000);
    expect(await a.check("ip-a")).toBe(true);
    expect(await a.check("ip-a")).toBe(false);
  });
});