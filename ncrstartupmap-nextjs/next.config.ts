import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { securityHeaders } from "@/lib/security/headers";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this sub-project. The parent directory
  // also has a lockfile (package-lock.json), which otherwise makes Next guess
  // the wrong root and warn on every boot.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  // Single source of truth for security headers (src/lib/security/headers.ts),
  // enforced here for every route. Deliberately not in markdown redirects.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: Object.entries(securityHeaders).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Only upload source maps when the auth token is present (CI/prod builds).
  // Local dev builds skip silently — no token, no leak, no failure.
  silent: true,
  widenClientFileUpload: true,
});

