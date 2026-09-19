import * as Sentry from "@sentry/nextjs";

/**
 * Client-side error reporting for the dashboard error boundary (Phase U4)
 * and the root `global-error.tsx` fallback.
 *
 * Sentry is the primary transport. P2-7 (audit M9): the old `monitorError`
 * fetch to the non-existent /api/analytics/error endpoint was removed —
 * dev visibility now comes from a plain dev-only console.warn, so local
 * development without a Sentry DSN stays silent by default and production
 * never posts errors to a missing route.
 */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}): void {
  // react-error-boundary v6 types onError's error as `unknown` — normalize the
  // rare non-Error value (string / opaque object) so transports can use it.
  const normalized = error instanceof Error ? error : new Error(String(error));
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(normalized, { extra: context });
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[reportClientError]", normalized, context);
  }
}
