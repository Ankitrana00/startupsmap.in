import * as Sentry from "@sentry/nextjs";

/**
 * Shared Sentry init options: same DSN/env/release everywhere, PII scrubbed
 * in `beforeSend` from day one (Phase 4 brought forward — never ship
 * unsanitized events, even to dev).
 *
 * No-op when NEXT_PUBLIC_SENTRY_DSN is unset (local dev without secrets).
 */

export const SENTRY_DENY_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-forwarded-for",
  "x-real-ip",
]);

export function scrubSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null; // drop: no destination configured
  // Strip request bodies — submit/promote forms carry emails, phone
  // numbers, company names. Never let user input land in Sentry.
  if (event.request?.data) {
    delete event.request.data;
  }
  // Strip sensitive headers (cookies, auth, client IPs).
  const headers = event.request?.headers as
    | Record<string, unknown>
    | undefined;
  if (headers) {
    for (const key of Object.keys(headers)) {
      if (SENTRY_DENY_HEADERS.has(key.toLowerCase())) {
        delete headers[key];
      }
    }
  }
  // Breadcrumbs can carry form URLs with query PII — drop query strings.
  for (const crumb of event.breadcrumbs ?? []) {
    if (typeof crumb.data?.url === "string") {
      try {
        const url = new URL(crumb.data.url);
        url.search = "";
        crumb.data.url = url.toString();
      } catch {
        delete crumb.data.url;
      }
    }
  }
  return event;
}

export const sentrySharedOptions: Sentry.BrowserOptions &
  Sentry.NodeOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Low starting budget (Phase 0 decision): errors always, traces sampled.
  tracesSampleRate: 0.1,
  // Browser noise that is never actionable — drop before it becomes issues.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
  ],
  beforeSend: scrubSentryEvent,
  // Never send PII-adjacent defaults.
  sendDefaultPii: false,
};
