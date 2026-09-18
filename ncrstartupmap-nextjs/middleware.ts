import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/lib/security/headers";
import { isAdminPath } from "@/lib/middleware/paths";

// Paths that must never appear in search results: admin panel, JSON APIs,
// auth-walled account pages, and token-gated verification links. Served as
// an `X-Robots-Tag` HTTP header so it covers every route (including layouts
// and client components, where `export const metadata` is not allowed).
// Public feature pages (/, /jobs, /submit, /promote) get no header → indexed.
const NOINDEX_PREFIXES = ["/admin", "/api", "/account", "/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === "production";

  // ─── Admin Route Protection ────────────────────────────────────────────
  // C3: block BOTH the admin UI (/admin/*) and its auth API (/api/admin/*) in
  // production unless explicitly enabled. Previously only "/admin" matched, so
  // /api/admin/login|verify|logout stayed publicly reachable while the pages
  // redirected away. To temporarily enable in production, set:
  //   NEXT_PUBLIC_ADMIN_ENABLED=true
  if (isProduction && isAdminPath(pathname)) {
    const adminEnabled = process.env.NEXT_PUBLIC_ADMIN_ENABLED === "true";
    if (!adminEnabled) {
      // UI paths redirect to the homepage (don't reveal the route exists).
      // API paths get a flat 404 — a redirect from an API is meaningless and
      // would still leak that the endpoint exists.
      if (pathname.startsWith("/api/")) {
        return new NextResponse("Not Found", { status: 404 });
      }
      // Redirect to homepage instead of revealing admin route existence
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Security headers — single source of truth (src/lib/security/headers.ts).
  // Only apply in production to avoid HSTS/CSP issues during development.
  const response = NextResponse.next();
  if (isProduction) {
    const headers = getSecurityHeaders();
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const rateLimit = request.headers.get("x-rate-limit") || "100";
    response.headers.set("X-RateLimit-Limit", rateLimit);
  }

  // noindex for private routes — belt-and-suspenders alongside robots.txt
  // disallow (robots.txt is advisory; X-Robots-Tag is enforced at index time).
  if (NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon\\.svg).*)"],
};
