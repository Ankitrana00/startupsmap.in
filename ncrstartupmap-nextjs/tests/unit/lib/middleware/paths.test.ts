import { describe, it, expect } from "vitest";
import { isAdminPath } from "@/lib/middleware/paths";

// C3: the middleware previously matched only "/admin", leaving
// /api/admin/login|verify|logout ungated in production.
describe("isAdminPath (middleware gate helper)", () => {
  it("gates the admin UI and the admin API", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/login")).toBe(true);
    expect(isAdminPath("/admin/submissions")).toBe(true);
    expect(isAdminPath("/api/admin")).toBe(true);
    expect(isAdminPath("/api/admin/login")).toBe(true);
    expect(isAdminPath("/api/admin/verify")).toBe(true);
    expect(isAdminPath("/api/admin/logout")).toBe(true);
  });

  it("does not gate lookalike or public paths", () => {
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/adminx")).toBe(false); // slash-guard: no false positive
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/api/admin-public")).toBe(false);
    expect(isAdminPath("/api/startups")).toBe(false);
    expect(isAdminPath("/api/submit")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
  });
});
