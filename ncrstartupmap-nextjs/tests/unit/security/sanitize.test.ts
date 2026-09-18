// XSS Protection Unit Tests
import { describe, it, expect } from "vitest";
import { sanitizeUrl, sanitizeInput } from "@/lib/security/sanitize";

describe("XSS Protection - sanitizeUrl", () => {
  it("should block javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("should block case variations of javascript:", () => {
    expect(sanitizeUrl("JaVaScRiPt:alert(1)")).toBe("");
  });

  it("should block data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("should block vbscript: protocol", () => {
    expect(sanitizeUrl("vbscript:alert(1)")).toBe("");
  });

  it("should allow https: URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
  });

  it("should allow http: URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("should return empty string for empty input", () => {
    expect(sanitizeUrl("")).toBe("");
  });

  it("should return empty string for invalid URLs", () => {
    expect(sanitizeUrl("not-a-url")).toBe("");
  });

  it("should upgrade scheme-less linkedin.com URLs to https://", () => {
    // Real DB shape: unmapped_startups.linkedin = "linkedin.com/company/x"
    expect(sanitizeUrl("linkedin.com/company/arms4ai")).toBe(
      "https://linkedin.com/company/arms4ai",
    );
  });

  it("should upgrade scheme-less www domains to https://", () => {
    expect(sanitizeUrl("www.example.com")).toBe("https://www.example.com/");
  });

  it("should treat host.tld:port as a bare hostname, not a scheme", () => {
    expect(sanitizeUrl("example.com:8080/path")).toBe(
      "https://example.com:8080/path",
    );
  });

  it("should still reject dot-less arbitrary words", () => {
    expect(sanitizeUrl("randomtext")).toBe("");
  });

  it("should still reject scheme-like non-http(s) hosts (localhost:3000)", () => {
    expect(sanitizeUrl("localhost:3000")).toBe("");
  });
});

describe("XSS Protection - sanitizeInput", () => {
  it("should escape script tags", () => {
    // The sanitizeInput function also escapes forward slashes
    expect(sanitizeInput("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;"
    );
  });

  it("should escape img tags with onerror", () => {
    expect(sanitizeInput("<img src=x onerror=alert(1)>")).toBe(
      "&lt;img src=x onerror=alert(1)&gt;"
    );
  });

  it("should pass through normal text", () => {
    expect(sanitizeInput("normal text")).toBe("normal text");
  });

  it("should handle empty string", () => {
    expect(sanitizeInput("")).toBe("");
  });
});
