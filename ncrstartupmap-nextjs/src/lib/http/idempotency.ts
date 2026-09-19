import { createHash } from "node:crypto";
import { getRedisClient } from "@/lib/cache/redis";
import { log } from "@/lib/logging/logger";

/**
 * P3-1 (audit §3, §8.2): idempotency for the two email-sending POST routes.
 *
 * A double-click, a proxy retry or an impatient refresh used to send the
 * owner a second email (and, for /api/submit, a second Supabase row). The
 * route now claims a key before doing any work and replays the stored
 * response for a duplicate instead of repeating it.
 *
 * Two key sources, in priority order:
 *   1. A client-supplied `Idempotency-Key` header (TTL 24h) — honored for
 *      explicit retry semantics; reused with a *different* payload is a 409.
 *   2. A SHA-256 fingerprint of the validated payload (TTL 10 min) — covers
 *      clients that send no header at all.
 *
 * Storage is the shared KV client (lib/cache/redis.ts): Upstash in prod,
 * bounded in-memory fallback in dev, so local boot needs no Redis.
 */

/** What the route will return when the same request is replayed. */
export type IdempotentResponse = { status: number; body: unknown };

/** An entry is written in two phases: claim (response null) then commit. */
type StoredEntry = { fingerprint: string; response: IdempotentResponse | null };

export type IdempotencyResult =
  | {
      status: "fresh";
      /** Persist the response so a duplicate replays it verbatim. */
      commit: (response: IdempotentResponse) => Promise<void>;
      /** Drop the claim after a 5xx so the caller's retry is not blocked. */
      release: () => Promise<void>;
    }
  | { status: "replay"; response: IdempotentResponse }
  | { status: "conflict"; reason: "in_flight" | "fingerprint_mismatch" };

/** Client keys are honored for a day (plan P3-1). */
const CLIENT_KEY_TTL_SECONDS = 24 * 60 * 60;

/**
 * Payload fingerprints cover double-clicks and network retries. Deliberately
 * shorter than a client key's window: a genuine re-submission much later with
 * the same payload must not be silently swallowed for 24h.
 */
const FINGERPRINT_TTL_SECONDS = 10 * 60;

/** Bounded key namespace — absurd Idempotency-Key values are ignored. */
const MAX_KEY_LENGTH = 200;
const KEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * Deterministic JSON: keys sorted recursively so two logically identical
 * payloads with different key order fingerprint identically.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

/** SHA-256 hex digest of the validated payload. */
export function fingerprintPayload(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

async function readEntry(key: string): Promise<StoredEntry | null> {
  const raw = await getRedisClient().get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredEntry;
    if (typeof parsed?.fingerprint !== "string") return null;
    return parsed;
  } catch {
    // Corrupt value (manual edit / partial write) — treat as absent.
    return null;
  }
}

function classify(
  entry: StoredEntry,
  fingerprint: string,
  key: string,
): IdempotencyResult {
  if (entry.fingerprint !== fingerprint) {
    log.warn("[idempotency] key reused with a different payload", { key });
    return { status: "conflict", reason: "fingerprint_mismatch" };
  }
  if (!entry.response) {
    // First request is still in flight (or died before commit/release).
    return { status: "conflict", reason: "in_flight" };
  }
  return { status: "replay", response: entry.response };
}

/** 409 copy for the route layer, keyed by the conflict reason. */
export function idempotencyConflictMessage(
  reason: "in_flight" | "fingerprint_mismatch",
): string {
  return reason === "in_flight"
    ? "An identical request is already being processed. Please wait a moment."
    : "This Idempotency-Key was already used for a different payload.";
}

/**
 * Claim the request's idempotency key. Call after validation (the fingerprint
 * must cover validated data, not raw input) and before any irreversible work.
 * On a 5xx call `release()` so the caller's retry can proceed; on success call
 * `commit(response)`.
 */
export async function beginIdempotentRequest(
  request: Request,
  options: { route: string; payload: unknown },
): Promise<IdempotencyResult> {
  const store = getRedisClient();
  const fingerprint = fingerprintPayload(options.payload);

  const raw = request.headers.get("idempotency-key")?.trim() ?? "";
  const clientKey =
    raw.length > 0 && raw.length <= MAX_KEY_LENGTH && KEY_PATTERN.test(raw)
      ? raw
      : null;
  if (raw && !clientKey) {
    log.warn("[idempotency] ignored malformed Idempotency-Key header", {
      route: options.route,
      length: raw.length,
    });
  }

  const key = clientKey
    ? `idem:${options.route}:k:${clientKey}`
    : `idem:${options.route}:f:${fingerprint}`;
  const ttl = clientKey ? CLIENT_KEY_TTL_SECONDS : FINGERPRINT_TTL_SECONDS;

  const entry = await readEntry(key);
  if (entry) return classify(entry, fingerprint, key);

  // setnx is the atomic guard: two concurrent double-clicks both pass the read
  // above, but only one wins the claim.
  const claimed = await store.setnx(
    key,
    JSON.stringify({ fingerprint, response: null }),
    ttl,
  );
  if (!claimed) {
    const raced = await readEntry(key);
    if (raced) return classify(raced, fingerprint, key);
    // The blocker is not a readable entry — a corrupt stored value, or a claim
    // that expired between the read and the setnx. Clear it and re-claim once;
    // nothing was committed under that key, so no replay can be lost.
    await store.del(key);
    const reclaimed = await store.setnx(
      key,
      JSON.stringify({ fingerprint, response: null }),
      ttl,
    );
    if (!reclaimed) return { status: "conflict", reason: "in_flight" };
  }

  return {
    status: "fresh",
    async commit(response) {
      await store.set(key, JSON.stringify({ fingerprint, response }), ttl);
    },
    async release() {
      await store.del(key);
    },
  };
}