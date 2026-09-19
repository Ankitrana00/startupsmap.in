/**
 * P1-3 (audit H4): centralized client-IP extraction for rate limiting.
 * Order: x-real-ip first (Vercel strips inbound x-forwarded-for spoofing but
 * x-real-ip is platform-controlled), then the leftmost x-forwarded-for hop,
 * falling back to "unknown". All per-endpoint limiters must use this helper
 * so a spoofed x-forwarded-for can never bypass a bucket.
 */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
