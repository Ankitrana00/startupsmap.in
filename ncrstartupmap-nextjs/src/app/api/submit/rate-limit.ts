import { createLimiter } from "@/lib/limiters";

/** Startup submissions: 5 requests/hour/IP (docs/API_REFERENCE.md). */
export const limiter = createLimiter(5, 60 * 60 * 1000);
export const checkRateLimit = limiter.check;
