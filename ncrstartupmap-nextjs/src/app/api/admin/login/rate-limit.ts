import { createRateLimiter } from "@/lib/rate-limit/create-limiter";

/**
 * Admin login attempts (C3): 5 per 15 min per IP — hardens the brute-force
 * surface on the credential endpoint. Mirrors `api/submit/rate-limit.ts`;
 * a dedicated instance so the admin quota never shares buckets with the
 * public flows (per-endpoint quotas are the factory's contract).
 */
export const limiter = createRateLimiter(5, 15 * 60 * 1000);
export const checkRateLimit = limiter.check;
