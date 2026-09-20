import { createLimiter } from "@/lib/limiters";

/** Promotion leads: 3 requests/hour/IP (low volume, high value). */
export const limiter = createLimiter(3, 60 * 60 * 1000);
export const checkRateLimit = limiter.check;