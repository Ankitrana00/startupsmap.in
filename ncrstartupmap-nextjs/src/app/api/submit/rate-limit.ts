import { createRateLimiter } from "@/lib/rate-limit/create-limiter";

/** Startup submissions: 5 requests/hour/IP (docs/API_REFERENCE.md). */
export const limiter = createRateLimiter(5, 60 * 60 * 1000);
export const checkRateLimit = limiter.check;
