import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";
import { log } from "@/lib/logging/logger";
import { promoteSchema } from "./validate";
import { checkRateLimit, limiter } from "./rate-limit";
import { getClientIp } from "@/lib/middleware/ip-utils";
import { sendPromotionLead } from "@/lib/email/send";
import { isSameOrigin } from "@/lib/security/same-origin";
import {
  beginIdempotentRequest,
  idempotencyConflictMessage,
} from "@/lib/http/idempotency";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // P2-6 (audit §3): correlation ID set by middleware — passed into the
  // Sentry tag so the event can be matched to its request's structured logs.
  const requestId = request.headers.get("x-request-id") ?? undefined;

  // Rate limit before any parsing work (3 requests/hour/IP).
  // P1-3: centralized, x-real-ip-first IP extraction.
  const ip = getClientIp(request);
  if (!(await checkRateLimit(ip))) {
    // H3: surface a Retry-After so callers can show a cooldown instead of
    // a flat "try again later".
    const retryAfter = await limiter.retryAfterSeconds(ip);
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
      { message: "Request submitted successfully" },
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

  // P3-1 (audit §3): claim the idempotency key before sending, so a duplicate
  // submit replays the stored 201 instead of emailing the owner twice.
  const idempotency = await beginIdempotentRequest(request, {
    route: "promote",
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

  // Deliver the lead to the owner's inbox (same Gmail, labeled [Promotion Ad]).
  try {
    await sendPromotionLead(parsed.data);
    const responseBody = {
      message: "Request submitted successfully",
    };
    // P3-1: store the outcome so an identical retry replays this 201.
    await idempotency.commit({ status: 201, body: responseBody });
    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    log.error("[api/promote] Failed to deliver promotion lead email", err);
    reportServerError(err, { route: "api/promote", layer: "email", requestId });
    // P3-1: sending failed, so free the key — a retry must not be rejected as
    // a duplicate of a request that never succeeded.
    await idempotency.release();
    return NextResponse.json(
      { error: "Could not submit your request. Please try again later." },
      { status: 500 },
    );
  }
}
