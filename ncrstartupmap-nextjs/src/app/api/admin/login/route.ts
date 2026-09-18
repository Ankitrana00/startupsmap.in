import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, generateAdminToken } from "@/lib/admin/auth";
import { reportServerError } from "@/lib/error/report-server-error";
import { checkRateLimit, limiter } from "./rate-limit";

/** Same IP extraction as /api/submit (x-forwarded-for first hop, then x-real-ip). */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // C3: rate limit BEFORE any parsing/credential work so brute-force floods
  // are rejected up front (same pattern as /api/submit).
    const ip = clientIp(req);
  if (!checkRateLimit(ip)) {
    // H3: surface Retry-After so callers can show a cooldown.
    const retryAfter = limiter.retryAfterSeconds(ip);
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Verify credentials
    const user = await verifyAdminCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

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
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
    reportServerError(error, { route: "api/admin/login" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}