import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, generateAdminToken, TOKEN_TTL_SECONDS } from "@/lib/admin/auth";
import { getClientIp } from "@/lib/middleware/ip-utils";
import { reportServerError } from "@/lib/error/report-server-error";
import { checkRateLimit, limiter } from "./rate-limit";
import { recordAdminAuth } from "@/lib/admin/audit-login";
import { z } from "zod";

/** P2-1 (audit M1): server-side schema for the login body validation. */
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(1024),
});

export async function POST(req: NextRequest) {
  // P2-6: correlation ID set by middleware — used in the audit trail below.
  const requestId = req.headers.get("x-request-id") ?? undefined;

  // C3: rate limit BEFORE any parsing/credential work so brute-force floods
  // are rejected up front (same pattern as /api/submit).
  const ip = getClientIp(req);
  if (!(await checkRateLimit(ip))) {
    // P3-4: record throttling as its own outcome so a brute-force burst is
    // visible in the audit trail even though no credentials were checked.
    recordAdminAuth("rate_limited", { ip, requestId });
    // H3: surface Retry-After so callers can show a cooldown.
    const retryAfter = await limiter.retryAfterSeconds(ip);
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const body = await req.json();

    // P2-1 (audit M1): zod validation replaces the old presence-only check —
    // non-string / oversized / malformed payloads now get 400.
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Verify credentials
    const user = await verifyAdminCredentials(email, password);
    if (!user) {
      // P3-4: failed attempt — logged, and escalated to Sentry after a burst
      // of consecutive failures from this IP.
      recordAdminAuth("failure", { ip, requestId });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // P3-4: successful login — clears the IP's failure streak.
    recordAdminAuth("success", { ip, requestId });

    // Generate JWT token
    const token = await generateAdminToken(user);

    // Set secure HTTP-only cookie
    const response = NextResponse.json(
      { success: true, message: "Login successful" },
      { status: 200 }
    );

    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // P1-2: cookie lifetime now matches the 12h token TTL (was 30 days).
      maxAge: TOKEN_TTL_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_PASSWORD not configured") {
      return NextResponse.json(
        { error: "Admin login is not configured" },
        { status: 500 }
      );
    }
    // Unexpected failure (JWT signing, credential store) — worth an alert.
    // P2-6: correlation ID set by middleware — tagged on the Sentry event.
    reportServerError(error, {
      route: "api/admin/login",
      requestId: req.headers.get("x-request-id") ?? undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}