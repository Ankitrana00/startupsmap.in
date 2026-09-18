import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";
import { promoteSchema } from "./validate";
import { checkRateLimit, limiter } from "./rate-limit";
import { sendPromotionLead } from "@/lib/email/send";

/** Reject cross-site form abuse: the Origin must match our own host. */
function isSameOrigin(request: Request): boolean {
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

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit before any parsing work (3 requests/hour/IP).
      const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  if (!checkRateLimit(ip)) {
    // H3: surface a Retry-After so callers can show a cooldown instead of
    // a flat "try again later".
    const retryAfter = limiter.retryAfterSeconds(ip);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Honeypot: real users never see or fill this hidden field. Bots that do
  // are silently "accepted" and discarded — the lead is never stored/sent.
  if (body.honeypot_website) {
    return NextResponse.json(
      { success: true, message: "Request submitted successfully" },
      { status: 201 },
    );
  }

  // Server-side validation — the client's safeParse is UX only;
  // this is the actual trust boundary.
  const parsed = promoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  // Deliver the lead to the owner's inbox (same Gmail, labeled [Promotion Ad]).
  try {
    await sendPromotionLead(parsed.data);
    return NextResponse.json(
      { success: true, message: "Request submitted successfully" },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to deliver promotion lead email:", err);
    reportServerError(err, { route: "api/promote", layer: "email" });
    return NextResponse.json(
      { error: "Could not submit your request. Please try again later." },
      { status: 500 },
    );
  }
}
