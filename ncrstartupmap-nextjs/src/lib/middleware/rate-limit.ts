const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(
  req: Request,
  limit: number = 100,
  windowMs: number = 60 * 1000,
) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const existing = rateLimits.get(ip);

  if (!existing || now > existing.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false };
  }

  rateLimits.set(ip, { count: existing.count + 1, resetAt: existing.resetAt });
  return { allowed: true };
}
