import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error reporting (Sentry Phase 3).
 *
 * Single seam for API routes + email/DB layers. Tags every event with the
 * route and layer so Sentry issues group usefully (e.g. route:"api/submit",
 * layer:"email"). No-op when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is unset,
 * so local dev without secrets stays silent.
 *
 * Only call for unexpected 5xx — expected user errors (400/401/403/429,
 * validation, honeypot discards) must NOT be captured.
 */
export function reportServerError(
  error: unknown,
  context: {
    route: string;
    layer?: string;
    /** P2-6: middleware's per-request `x-request-id` — ties the Sentry event to the request's structured log lines. */
    requestId?: string;
    extra?: Record<string, unknown>;
  },
): void {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const normalized = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(normalized, {
    tags: {
      route: context.route,
      ...(context.layer ? { layer: context.layer } : {}),
      ...(context.requestId ? { requestId: context.requestId } : {}),
    },
    extra: context.extra,
  });
}
