import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { reportServerError } from "@/lib/error/report-server-error";
import { submitSchema } from "./validate";
import { checkRateLimit, limiter } from "./rate-limit";
import { sendSubmissionNotification } from "@/lib/email/send";

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

  // Rate limit first (5 submissions/hour/IP per docs/API_REFERENCE.md) so
  // floods are rejected before any parsing work.
    const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  if (!checkRateLimit(ip)) {
    // H3: surface a Retry-After so callers can show a cooldown instead of
    // a flat "try again later".
    const retryAfter = limiter.retryAfterSeconds(ip);
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
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
  // are silently "accepted" and discarded — never emailed.
  if (body.honeypot_website) {
    return NextResponse.json({ message: "Submission received" }, { status: 201 });
  }

  // Server-side validation — the client's safeParse is UX only;
  // this is the actual trust boundary.
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }

  // Deliver the submission to the site owner's inbox (primary path) and
  // store in Supabase (best-effort — email success must not be undone by
  // a DB failure, e.g. when Supabase env vars are missing).
  try {
    await sendSubmissionNotification(parsed.data);
  } catch (err) {
    console.error("Failed to deliver submission email:", err);
    reportServerError(err, { route: "api/submit", layer: "email" });
    return NextResponse.json(
      { error: "Could not deliver your submission. Please try again later." },
      { status: 500 },
    );
  }

  // Best-effort Supabase insert — failures are logged, never surfaced to the user.
  try {
    const { error: dbError } = await supabase.from("startups").insert(parsed.data);
    if (dbError) {
      console.error("Failed to store submission in Supabase:", dbError);
      reportServerError(dbError, { route: "api/submit", layer: "db" });
    }
  } catch (err) {
    console.error("Failed to store submission in Supabase:", err);
    reportServerError(err, { route: "api/submit", layer: "db" });
  }

  return NextResponse.json({ message: "Submission received" }, { status: 201 });
}
