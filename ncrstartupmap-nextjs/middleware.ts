import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/lib/security/headers";
import { isAdminPath } from "@/lib/middleware/paths";
import { hppMiddleware } from "@/lib/security/hpp";

// Paths that must never appear in search results: admin panel, JSON APIs,
// auth-walled account pages, and token-gated verification links. Served as
// an `X-Robots-Tag` HTTP header so it covers every route (including layouts
// and client components, where `export const metadata` is not allowed).
// Public feature pages (/, /jobs, /submit, /promote) get no header → indexed.
const NOINDEX_PREFIXES = ["/admin", "/api", "/account", "/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === "production";

  // P2-6 (audit §3): per-request correlation ID. Always generated fresh — the
  // incoming `x-request-id` header is attacker-controlled and must never be
  // echoed (same lesson as the removed `x-rate-limit` echo, P2-8). It is set
  // on BOTH the request forwarded to route handlers (so reportServerError can
  // tag Sentry events) and the outgoing response (so client/dev logs and
  // Sentry events correlate to the same request).
  const requestId = crypto.randomUUID();

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
        return new NextResponse("Not Found", {
          status: 404,
          headers: { "x-request-id": requestId },
        });
      }
      // Redirect to homepage instead of revealing admin route existence
      return NextResponse.redirect(new URL("/", request.url), {
        headers: { "x-request-id": requestId },
      });
    }
  }

  // Security headers — single source of truth (src/lib/security/headers.ts).
  // Only apply in production to avoid HSTS/CSP issues during development.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  if (isProduction) {
    const headers = getSecurityHeaders();
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }

  // P2-8 (audit §4.2 + M8): HPP protection on GET APIs. Duplicate query
  // params are a parameter-pollution vector; the wired module returns a 400.
  // (The previous `x-rate-limit` echo — an attacker-controlled header copied
  // into X-RateLimit-Limit — was removed: it did no limiting and trusted
  // client input. Real limiting lives in the per-endpoint limiters.)
  if (request.method === "GET" && pathname.startsWith("/api/")) {
    const hppResult = hppMiddleware(request);
    if (hppResult) {
      hppResult.headers.set("x-request-id", requestId);
      return hppResult;
    }
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
