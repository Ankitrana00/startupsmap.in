// Environment-aware CSP: dev needs 'unsafe-eval' (Turbopack/HMR), production
// forbids it — eval in prod is the classic XSS enabler.
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io"
  : "'self' 'unsafe-inline' https://www.googletagmanager.com https://plausible.io";

// img-src: self + data: (Leaflet placeholder) + OSM tiles (map) + picsum (ads) + GA.
// NOTE: never add cdn.example.com-style placeholders — dead allowlist entries widen
// attack surface for zero benefit.
const imgSrc =
  "'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://picsum.photos https://www.google-analytics.com";

/**
 * P3-6 (audit L1): derive Sentry's CSP report endpoint from the DSN, so
 * browser-reported violations land in Sentry's Security reports instead of
 * only the console. Sentry's ingest DSN looks like
 *   https://<publicKey>@o<org>.ingest.sentry.io/<projectId>
 * and the report endpoint is
 *   https://o<org>.ingest.sentry.io/api/<projectId>/security/?sentry_key=<publicKey>
 * Returns null when no DSN is configured (local dev) or it is malformed, in
 * which case the CSP is emitted without a report-uri.
 */
export function buildCspReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!publicKey || !projectId || !url.hostname.endsWith(".ingest.sentry.io")) {
      return null;
    }
    return `https://${url.hostname}/api/${projectId}/security/?sentry_key=${publicKey}`;
  } catch {
    return null;
  }
}

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // connect-src: same-origin APIs + Supabase + GA/Plausible event beacons
  // + Sentry ingest (error delivery — without this the CSP blocks it).
  "connect-src 'self' https://api.startupsmap.in https://*.supabase.co https://www.google-analytics.com https://plausible.io https://*.ingest.sentry.io",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'", // Tailwind runtime styles require it
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

const cspReportUri = buildCspReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN);
if (cspReportUri) cspDirectives.push(`report-uri ${cspReportUri}`);

export const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  // P3-6: X-XSS-Protection removed — deprecated, ignored by modern browsers,
  // and the legacy XSS auditor it enabled could itself introduce leaks. The
  // CSP below is the supported replacement.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": cspDirectives.join("; "),
  // P3-6 review: geolocation stays blocked. Leaflet's map view never calls
  // navigator.geolocation (no reference anywhere in src/), and the app only
  // plots startup locations from the database, so enabling it would widen
  // permissions for zero functionality.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

export function getSecurityHeaders(): Record<string, string> {
  return { ...securityHeaders };
}
