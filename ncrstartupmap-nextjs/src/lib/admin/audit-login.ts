import { reportServerError } from "@/lib/error/report-server-error";
import { log } from "@/lib/logging/logger";

/**
 * P3-4 (audit §8.4): admin authentication audit trail.
 *
 * There was no record of who logged in, when, or of failed-attempt bursts.
 * Each outcome now emits a structured log line (no PII beyond IP/outcome —
 * consistent with the Sentry scrub rules in sentry.shared.config.ts), and a
 * burst of consecutive failures for one IP escalates to Sentry so a
 * brute-force attempt is visible without watching logs.
 *
 * Deliberately not a table: the admin surface is a single account and the
 * audit trail only needs to answer "who/when/how often", which the log
 * pipeline already retains. Revisit if per-admin accounts land.
 */

export type AdminAuthOutcome = "success" | "failure" | "rate_limited" | "logout";

/** Consecutive 401s from one IP that escalate to Sentry (plan P3-4). */
const FAILURE_BURST_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_IPS = 1_000;

type FailureState = { count: number; windowStart: number; reported: boolean };

const failures = new Map<string, FailureState>();

function noteFailure(ip: string): { count: number; shouldReport: boolean } {
  const now = Date.now();

  // Bound memory: drop expired windows once too many IPs are tracked.
  if (failures.size > MAX_TRACKED_IPS) {
    for (const [key, state] of failures) {
      if (now - state.windowStart > FAILURE_WINDOW_MS) failures.delete(key);
    }
  }

  const current = failures.get(ip);
  if (!current || now - current.windowStart > FAILURE_WINDOW_MS) {
    failures.set(ip, { count: 1, windowStart: now, reported: false });
    return { count: 1, shouldReport: false };
  }

  current.count += 1;
  // Report once per burst — a sustained attack must not spam Sentry with an
  // event per attempt; the count in `extra` shows the escalation.
  const shouldReport =
    current.count >= FAILURE_BURST_THRESHOLD && !current.reported;
  if (shouldReport) current.reported = true;
  return { count: current.count, shouldReport };
}

/**
 * Record one admin auth outcome. Never throws and never blocks the response:
 * auditing must not be able to break login.
 */
export function recordAdminAuth(
  outcome: AdminAuthOutcome,
  context: { ip?: string; requestId?: string },
): void {
  const ip = context.ip ?? "unknown";
  const requestId = context.requestId;

  if (outcome === "success" || outcome === "logout") {
    // A successful login (or an explicit logout) clears the IP's failure streak.
    failures.delete(ip);
    log.info(`admin_${outcome === "logout" ? "logout" : "login"} outcome:${outcome}`, {
      event: outcome === "logout" ? "admin_logout" : "admin_login",
      outcome,
      ip,
      requestId,
    });
    return;
  }

  if (outcome === "rate_limited") {
    log.warn("admin_login outcome:rate_limited", {
      event: "admin_login",
      outcome,
      ip,
      requestId,
    });
    return;
  }

  const { count, shouldReport } = noteFailure(ip);
  log.warn("admin_login outcome:failure", {
    event: "admin_login",
    outcome,
    ip,
    requestId,
    consecutiveFailures: count,
  });

  if (shouldReport) {
    reportServerError(
      new Error(`Admin login burst: ${count} consecutive failures`),
      {
        route: "api/admin/login",
        layer: "auth",
        requestId,
        // IP only — no email, no attempted password.
        extra: { ip, consecutiveFailures: count },
      },
    );
  }
}

/** Test seam: forget all tracked failure windows. */
export function resetAdminAuthFailures(): void {
  failures.clear();
}