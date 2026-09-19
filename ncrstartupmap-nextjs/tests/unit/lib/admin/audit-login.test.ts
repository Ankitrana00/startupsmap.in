import { describe, it, expect, beforeEach, vi } from "vitest";
import { reportServerError } from "@/lib/error/report-server-error";
import {
  recordAdminAuth,
  resetAdminAuthFailures,
} from "@/lib/admin/audit-login";

/**
 * P3-4 (audit §8.4): admin auth audit trail.
 *
 * Escalation is asserted through the mocked Sentry seam so the test proves the
 * *burst* behaviour (log every failure, alert once) rather than log formatting.
 */
vi.mock("@/lib/error/report-server-error", () => ({
  reportServerError: vi.fn(),
}));

const reportMock = vi.mocked(reportServerError);

describe("recordAdminAuth — P3-4", () => {
  beforeEach(() => {
    resetAdminAuthFailures();
    reportMock.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("logs a successful login without reporting to Sentry", () => {
    recordAdminAuth("success", { ip: "10.0.0.1", requestId: "req-1" });
    expect(console.log).toHaveBeenCalled();
    expect(reportMock).not.toHaveBeenCalled();
  });

  it("escalates only after 3 consecutive failures from one IP", () => {
    recordAdminAuth("failure", { ip: "10.0.0.2" });
    recordAdminAuth("failure", { ip: "10.0.0.2" });
    expect(reportMock).not.toHaveBeenCalled();

    recordAdminAuth("failure", { ip: "10.0.0.2" });
    expect(reportMock).toHaveBeenCalledTimes(1);
    expect(reportMock.mock.calls[0][1]).toMatchObject({
      route: "api/admin/login",
      layer: "auth",
      extra: { ip: "10.0.0.2", consecutiveFailures: 3 },
    });

    // A sustained attack must not spam one Sentry event per attempt.
    recordAdminAuth("failure", { ip: "10.0.0.2" });
    recordAdminAuth("failure", { ip: "10.0.0.2" });
    expect(reportMock).toHaveBeenCalledTimes(1);
  });

  it("clears the failure streak on a successful login", () => {
    recordAdminAuth("failure", { ip: "10.0.0.3" });
    recordAdminAuth("failure", { ip: "10.0.0.3" });
    recordAdminAuth("success", { ip: "10.0.0.3" });

    recordAdminAuth("failure", { ip: "10.0.0.3" });
    recordAdminAuth("failure", { ip: "10.0.0.3" });
    expect(reportMock).not.toHaveBeenCalled();
  });

  it("does not accumulate failures across different IPs", () => {
    recordAdminAuth("failure", { ip: "10.0.0.4" });
    recordAdminAuth("failure", { ip: "10.0.0.5" });
    recordAdminAuth("failure", { ip: "10.0.0.6" });
    recordAdminAuth("failure", { ip: "10.0.0.4" });
    expect(reportMock).not.toHaveBeenCalled();
  });

  it("records rate limiting without counting it as a credential failure", () => {
    recordAdminAuth("rate_limited", { ip: "10.0.0.7" });
    recordAdminAuth("rate_limited", { ip: "10.0.0.7" });
    recordAdminAuth("rate_limited", { ip: "10.0.0.7" });
    recordAdminAuth("rate_limited", { ip: "10.0.0.7" });
    expect(console.warn).toHaveBeenCalled();
    expect(reportMock).not.toHaveBeenCalled();
  });

  it("tolerates a missing IP / requestId (never throws)", () => {
    expect(() => recordAdminAuth("failure", {})).not.toThrow();
    expect(() => recordAdminAuth("logout", {})).not.toThrow();
    expect(() => recordAdminAuth("success", {})).not.toThrow();
  });
});