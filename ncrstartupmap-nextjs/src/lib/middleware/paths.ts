/**
 * Admin route prefixes (C3). Single source of truth for middleware gating:
 * covers both the admin UI (/admin) and its auth API (/api/admin), which
 * previously was NOT gated (only "/admin" was matched).
 * Exact-or-slash semantics so lookalikes (/administration, /adminx) are NOT
 * gated. Pure function so it is unit-testable without the edge runtime.
 */
export const ADMIN_PATH_PREFIXES = ["/admin", "/api/admin"] as const;

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
