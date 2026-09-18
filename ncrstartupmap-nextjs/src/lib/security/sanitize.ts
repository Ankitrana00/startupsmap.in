// Accept null/undefined: real Supabase rows can have null in any text column.
export function sanitizeInput(input: string | null | undefined): string {
  return (input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeUrl(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  // A URI scheme is "ALPHA *( ALPHA / DIGIT / "+" / "-" ) ':'" — no real scheme
  // contains a dot, while "host.tld:8080" does, so a dot before the first ':'
  // means host:port, not scheme.
  const hasScheme = /^[a-z][a-z0-9+-]*:/i.test(raw);
  // DB rows (unmapped_startups) store bare hostnames like
  // "linkedin.com/company/x". Upgrade those to https:// so legitimate links
  // render, but only when the value looks like a domain (dot in the host
  // part) — arbitrary words ("not-a-url") stay rejected.
  const hostPart = raw.split(/[/?#]/)[0];
  const looksLikeDomain = hostPart.includes(".");
  const candidate = hasScheme || !looksLikeDomain ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}
export function sanitizeAdTarget(target: string | null | undefined): string {
  const t = (target ?? "").trim();
  if (t.startsWith("/") && !t.startsWith("//") && !/[\s\\<>"']/.test(t)) return t;
  return sanitizeUrl(t);
}
