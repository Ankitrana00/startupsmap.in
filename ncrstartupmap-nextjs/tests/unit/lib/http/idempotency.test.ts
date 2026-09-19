import { describe, it, expect } from "vitest";
import { getRedisClient } from "@/lib/cache/redis";
import {
  beginIdempotentRequest,
  fingerprintPayload,
  idempotencyConflictMessage,
} from "@/lib/http/idempotency";

/**
 * P3-1 (audit §3): idempotency for /api/submit and /api/promote.
 *
 * The store is the shared KV client; with no Upstash env vars configured in
 * the test environment it uses the bounded in-memory fallback. Every test uses
 * a unique payload/key so the module-level Map cannot leak state between them.
 */

function postRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/submit", {
    method: "POST",
    headers,
  });
}

/** Unique, well-formed client key — isolates each test's KV namespace. */
function uniqueClientKey(): string {
  return `test-${crypto.randomUUID()}`;
}

describe("fingerprintPayload", () => {
  it("is order-independent for object keys", () => {
    expect(fingerprintPayload({ a: 1, b: 2 })).toBe(
      fingerprintPayload({ b: 2, a: 1 }),
    );
  });

  it("differs for different payloads", () => {
    expect(fingerprintPayload({ email: "a@b.com" })).not.toBe(
      fingerprintPayload({ email: "c@d.com" }),
    );
  });

  it("ignores undefined values but keeps arrays ordered", () => {
    expect(fingerprintPayload({ a: 1, b: undefined })).toBe(
      fingerprintPayload({ a: 1 }),
    );
    expect(fingerprintPayload([1, 2])).not.toBe(fingerprintPayload([2, 1]));
  });
});

describe("beginIdempotentRequest — fingerprint keys (no header)", () => {
  it("returns fresh, then replays the committed response for a duplicate", async () => {
    const payload = { name: `dup-${crypto.randomUUID()}` };

    const first = await beginIdempotentRequest(postRequest(), {
      route: "submit",
      payload,
    });
    expect(first.status).toBe("fresh");

    // A second identical request before commit must not run the work twice.
    const inFlight = await beginIdempotentRequest(postRequest(), {
      route: "submit",
      payload,
    });
    expect(inFlight).toMatchObject({ status: "conflict", reason: "in_flight" });

    if (first.status !== "fresh") throw new Error("expected fresh");
    await first.commit({ status: 201, body: { message: "Submission received" } });

    const replay = await beginIdempotentRequest(postRequest(), {
      route: "submit",
      payload,
    });
    expect(replay).toMatchObject({ status: "replay" });
    if (replay.status !== "replay") throw new Error("expected replay");
    expect(replay.response).toEqual({
      status: 201,
      body: { message: "Submission received" },
    });
  });

  it("frees the key on release() so a retry after a 5xx is fresh", async () => {
    const payload = { name: `release-${crypto.randomUUID()}` };

    const first = await beginIdempotentRequest(postRequest(), {
      route: "promote",
      payload,
    });
    if (first.status !== "fresh") throw new Error("expected fresh");
    await first.release();

    const retry = await beginIdempotentRequest(postRequest(), {
      route: "promote",
      payload,
    });
    expect(retry.status).toBe("fresh");
  });

  it("does not collide across routes with the same payload", async () => {
    const payload = { shared: `route-${crypto.randomUUID()}` };
    const submit = await beginIdempotentRequest(postRequest(), {
      route: "submit",
      payload,
    });
    const promote = await beginIdempotentRequest(postRequest(), {
      route: "promote",
      payload,
    });
    expect(submit.status).toBe("fresh");
    expect(promote.status).toBe("fresh");
  });
});

describe("beginIdempotentRequest — client Idempotency-Key header", () => {
  it("replays a committed response and rejects the same key with a new payload", async () => {
    const key = uniqueClientKey();
    const payloadA = { name: `client-${crypto.randomUUID()}` };

    const first = await beginIdempotentRequest(
      postRequest({ "Idempotency-Key": key }),
      { route: "submit", payload: payloadA },
    );
    if (first.status !== "fresh") throw new Error("expected fresh");
    await first.commit({ status: 201, body: { ok: true } });

    const replay = await beginIdempotentRequest(
      postRequest({ "Idempotency-Key": key }),
      { route: "submit", payload: payloadA },
    );
    expect(replay).toMatchObject({ status: "replay" });

    // Same key, different payload → 409, never a silent replay of the wrong body.
    const mismatch = await beginIdempotentRequest(
      postRequest({ "Idempotency-Key": key }),
      { route: "submit", payload: { name: "something-else" } },
    );
    expect(mismatch).toMatchObject({
      status: "conflict",
      reason: "fingerprint_mismatch",
    });
  });

  it("ignores malformed keys (whitespace / oversized) and falls back to the fingerprint", async () => {
    const payload = { name: `malformed-${crypto.randomUUID()}` };

    const first = await beginIdempotentRequest(
      postRequest({ "Idempotency-Key": "not a valid key!!" }),
      { route: "submit", payload },
    );
    expect(first.status).toBe("fresh");

    // The fingerprint key was claimed, so the same payload is a duplicate even
    // though the malformed header was discarded.
    const second = await beginIdempotentRequest(
      postRequest({ "Idempotency-Key": "x".repeat(500) }),
      { route: "submit", payload },
    );
    expect(second).toMatchObject({ status: "conflict", reason: "in_flight" });
  });

  it("treats a corrupt stored value as absent (fresh claim, not a 500)", async () => {
    const key = uniqueClientKey();
    await getRedisClient().set(
      `idem:submit:k:${key}`,
      "{ not json",
      60,
    );

    const result = await beginIdempotentRequest(
      postRequest({ "Idempotency-Key": key }),
      { route: "submit", payload: { name: "corrupt" } },
    );
    expect(result.status).toBe("fresh");
  });
});

describe("idempotencyConflictMessage", () => {
  it("returns distinct copy per conflict reason", () => {
    expect(idempotencyConflictMessage("in_flight")).toContain("already being processed");
    expect(idempotencyConflictMessage("fingerprint_mismatch")).toContain(
      "Idempotency-Key",
    );
  });
});
