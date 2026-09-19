import { describe, it, expect } from "vitest";
import {
  buildCspReportUri,
  securityHeaders,
} from "@/lib/security/headers";

/**
 * P3-6 (audit L1): header polish.
 * - X-XSS-Protection must no longer be emitted (deprecated; the CSP replaced it).
 * - A CSP report-uri is emitted exactly when a Sentry DSN is configured, and it
 *   must point at Sentry's security-report endpoint, not the ingest one.
 */

const VALID_DSN = "https://abc123publickey@o4507.ingest.sentry.io/4507111111";

describe("buildCspReportUri", () => {
  it("derives Sentry's security-report endpoint from a DSN", () => {
    expect(buildCspReportUri(VALID_DSN)).toBe(
      "https://o4507.ingest.sentry.io/api/4507111111/security/?sentry_key=abc123publickey",
    );
  });

  it("strips leading slashes and handles a trailing path", () => {
    expect(
      buildCspReportUri("https://key@o1.ingest.sentry.io/42"),
    ).toBe("https://o1.ingest.sentry.io/api/42/security/?sentry_key=key");
  });

  it("returns null without a DSN (local dev)", () => {
    expect(buildCspReportUri(undefined)).toBeNull();
    expect(buildCspReportUri("")).toBeNull();
  });

  it("returns null for a DSN that is not a Sentry ingest URL", () => {
    expect(buildCspReportUri("not a url")).toBeNull();
    expect(buildCspReportUri("https://key@example.com/42")).toBeNull();
    // Missing project id.
    expect(buildCspReportUri("https://key@o1.ingest.sentry.io")).toBeNull();
    // Missing public key.
    expect(buildCspReportUri("https://o1.ingest.sentry.io/42")).toBeNull();
  });
});

describe("securityHeaders — P3-6", () => {
  it("no longer sends the deprecated X-XSS-Protection header", () => {
    expect(securityHeaders).not.toHaveProperty("X-XSS-Protection");
  });

  it("still sends the essential hardening headers", () => {
    expect(securityHeaders["X-Frame-Options"]).toBe("DENY");
    expect(securityHeaders["X-Content-Type-Options"]).toBe("nosniff");
    expect(securityHeaders["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(securityHeaders["Permissions-Policy"]).toContain("geolocation=()");
  });

  it("keeps the CSP tight and consistent with the report-uri decision", () => {
    const csp = securityHeaders["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");

    // report-uri is only present when a DSN was configured for this run.
    const expected = buildCspReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN);
    if (expected) {
      expect(csp).toContain(`report-uri ${expected}`);
    } else {
      expect(csp).not.toContain("report-uri");
    }
  });
});