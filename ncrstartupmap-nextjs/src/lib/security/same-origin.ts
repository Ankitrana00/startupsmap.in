/**
 * Shared same-origin check (the pattern that lived inline in
 * /api/submit — now reused by /api/startups POST too).
 *
 * Reject cross-site form abuse: the Origin must match our own host.
 * Non-browser clients (curl, tests) pass — other layers (rate limit,
 * validation, auth) still apply to them.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, tests) — other layers still apply
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
