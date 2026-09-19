import { createRateLimiter } from "@/lib/rate-limit/create-limiter";

/** Admin session checks: 30 requests/minute/IP (fix plan P1-6, audit M7). */
export const limiter = createRateLimiter(30, 60 * 1000);
export const checkRateLimit = limiter.check;
