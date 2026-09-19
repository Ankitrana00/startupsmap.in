import { NextResponse } from "next/server";
import { insertStartupRow } from "@/lib/supabase";
import { reportServerError } from "@/lib/error/report-server-error";
import { log } from "@/lib/logging/logger";
import { submitSchema } from "./validate";
import { checkRateLimit, limiter } from "./rate-limit";
import { getClientIp } from "@/lib/middleware/ip-utils";
import { sendSubmissionNotification } from "@/lib/email/send";
import { isSameOrigin } from "@/lib/security/same-origin";
import {
  beginIdempotentRequest,
  idempotencyConflictMessage,
} from "@/lib/http/idempotency";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // P2-6 (audit §3): correlation ID set by middleware — passed into every
  // Sentry tag so an event can be matched to its request's structured logs.
  const requestId = request.headers.get("x-request-id") ?? undefined;

  // Rate limit first (5 submissions/hour/IP per docs/API_REFERENCE.md) so
  // floods are rejected before any parsing work. P1-3: centralized,
  // x-real-ip-first IP extraction.
  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip))) {
    // H3: surface a Retry-After so callers can show a cooldown instead of
    // a flat "try again later".
    const retryAfter = await limiter.retryAfterSeconds(ip);
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

  // P3-1 (audit §3): claim the idempotency key before any irreversible work,
  // so a double-click or proxy retry replays this response instead of sending
  // a second email / inserting a second row. Uses the client's
  // `Idempotency-Key` header when present, else a fingerprint of the payload.
  const idempotency = await beginIdempotentRequest(request, {
    route: "submit",
    payload: parsed.data,
  });
  if (idempotency.status === "replay") {
    return NextResponse.json(idempotency.response.body, {
      status: idempotency.response.status,
    });
  }
  if (idempotency.status === "conflict") {
    return NextResponse.json(
      { error: idempotencyConflictMessage(idempotency.reason) },
      { status: 409 },
    );
  }

  // Deliver the submission to the site owner's inbox (primary path) and
  // store in Supabase (best-effort — email success must not be undone by
  // a DB failure, e.g. when Supabase env vars are missing).
  try {
    await sendSubmissionNotification(parsed.data);
  } catch (err) {
    log.error("[api/submit] Failed to deliver submission email", err);
    // P3-1: the attempt failed, so free the key — the caller's retry must not
    // be rejected as a duplicate.
    await idempotency.release();
    reportServerError(err, { route: "api/submit", layer: "email", requestId });
    return NextResponse.json(
      { error: "Could not deliver your submission. Please try again later." },
      { status: 500 },
    );
  }

  // Best-effort Supabase insert (P0-3: service-role client with an explicit
  // column allowlist — the validated payload is never spread). Failures are
  // logged, never surfaced to the user.
  try {
    await insertStartupRow(parsed.data);
  } catch (err) {
    log.error("[api/submit] Failed to store submission in Supabase", err);
    reportServerError(err, { route: "api/submit", layer: "db", requestId });
  }

  // P3-1: remember the outcome so an identical retry replays it (201, same
  // body) rather than repeating the email + insert.
  await idempotency.commit({
    status: 201,
    body: { message: "Submission received" },
  });

  return NextResponse.json({ message: "Submission received" }, { status: 201 });
}
