import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin/auth";
import { cookies } from "next/headers";
import { reportServerError } from "@/lib/error/report-server-error";
import { getClientIp } from "@/lib/middleware/ip-utils";
import { checkRateLimit, limiter } from "./rate-limit";

export async function GET(request: Request) {
  // P1-6 (audit M7): the admin session check had no rate limit (30/min/IP).
  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json(
      { authenticated: false },
      {
        status: 429,
        headers: {
          "Retry-After": String(await limiter.retryAfterSeconds(ip)),
        },
      }
    );
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token");

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const user = await verifyAdminToken(token.value);
    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { authenticated: true, user },
      { status: 200 }
    );
  } catch (err) {
    // P2-6: correlation ID set by middleware — tagged on the Sentry event.
    reportServerError(err, {
      route: "api/admin/verify",
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
    // P2-3 (audit M3): 503 distinguishes an internal failure from a failed
    // auth check (401) — the client treats any non-OK as logged-out, so the
    // only contract change is observability, not UI behavior.
    return NextResponse.json(
      { authenticated: false },
      { status: 503 }
    );
  }
}