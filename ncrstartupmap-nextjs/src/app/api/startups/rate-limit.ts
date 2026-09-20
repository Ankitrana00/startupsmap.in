import { createLimiter } from "@/lib/limiters";

/** Public list endpoint: 60 requests/minute/IP (fix plan P1-6, audit M7). */
export const readLimiter = createLimiter(60, 60 * 1000, "startups-read");

/** Admin write endpoint: 30 requests/minute/IP — generous because it is
 * cookie-authenticated, but still bounded (fix plan P0-1, audit C1). */
export const writeLimiter = createLimiter(30, 60 * 1000, "startups-write");
