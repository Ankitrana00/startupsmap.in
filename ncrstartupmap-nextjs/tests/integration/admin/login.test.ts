import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/login/route";

// C3: the admin login route previously had NO rate limit, so the credential
// endpoint was a brute-force surface. The limiter is a dedicated instance of
// the shared factory (5 / 15 min / IP) — submit/promote quotas are untouched.
function loginRequest(ip: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("Admin login rate limiting", () => {
    it("rejects the 6th login attempt from the same IP with 429", async () => {
    const ip = "203.0.113.10";
    const statuses: number[] = [];
    let lastRes: Response | null = null;
    for (let i = 0; i < 6; i++) {
      const res = await POST(loginRequest(ip));
      statuses.push(res.status);
      if (i === 5) lastRes = res;
    }
    // Attempts 1–5 pass the limiter (they may 401 on bad credentials or 500
    // when ADMIN_PASSWORD is unset in the test env) — the limiter's job is to
    // stop attempt 6.
    for (const status of statuses.slice(0, 5)) {
      expect(status).not.toBe(429);
    }
    expect(statuses[5]).toBe(429);
    // H3: the 429 response must carry a Retry-After header (seconds) so
    // clients can show a cooldown window.
    expect(lastRes).not.toBeNull();
    expect(lastRes!.headers.get("Retry-After")).not.toBeNull();
  });

  it("does not rate-limit a different IP", async () => {
    const res = await POST(loginRequest("203.0.113.11"));
    expect(res.status).not.toBe(429);
  });
});
