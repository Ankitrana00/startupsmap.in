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

export const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": [
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
  ].join("; "),
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

export function getSecurityHeaders(): Record<string, string> {
  return { ...securityHeaders };
}
