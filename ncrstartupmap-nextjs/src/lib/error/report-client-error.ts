import * as Sentry from "@sentry/nextjs";
import { monitorError } from "@/lib/analytics/monitor-error";

/**
 * Client-side error reporting for the dashboard error boundary (Phase U4)
 * and the root `global-error.tsx` fallback.
 *
 * Sentry is the primary transport; `monitorError` (console) stays as the
 * local-dev fallback. No-op when NEXT_PUBLIC_SENTRY_DSN is unset, so local
 * dev without secrets stays silent. Signature unchanged — call sites
 * (error boundaries) do not change.
 */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}): void {
  // react-error-boundary v6 types onError's error as `unknown` — normalize the
  // rare non-Error value (string / opaque object) so transports can use it.
  const normalized = error instanceof Error ? error : new Error(String(error));
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(normalized, { extra: context });
  }
  monitorError(normalized, context);
}
