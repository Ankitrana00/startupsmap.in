import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The KV client is wrapped so tests can simulate an unavailable backend
 * (Upstash outage) without touching the real in-memory fallback behaviour.
 * `vi.hoisted` keeps the state object available inside the hoisted factory.
 */
const { kvState } = vi.hoisted(() => ({ kvState: { failWrites: false } }));

vi.mock("@/lib/cache/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cache/redis")>();
  return {
    ...actual,
    getRedisClient: () => {
      const client = actual.getRedisClient();
      return {
        ...client,
        set: async (key: string, value: string, ttl?: number) => {
          if (kvState.failWrites) throw new Error("KV unavailable");
          return client.set(key, value, ttl);
        },
      };
    },
  };
});

import { getRedisClient } from "@/lib/cache/redis";
import {
  getCachedStartupsList,
  invalidateStartupsList,
  setCachedStartupsList,
  type StartupsListPayload,
} from "@/lib/cache/startups-cache";

/**
 * P3-2 (audit §3): server-side cache for GET /api/startups.
 *
 * Keys are deterministic (`startups:list:${page}:${limit}`), so tests use
 * unique page numbers to avoid cross-test bleed through the module-level
 * in-memory fallback store. invalidateStartupsList() drops tracked keys.
 */

function payload(marker: string): StartupsListPayload {
  return {
    startups: [{ id: marker }],
    meta: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
  };
}

/** Distinct page number per test keeps KV keys isolated. */
let pageCounter = 900;
function nextPage(): number {
  return ++pageCounter;
}

describe("startups-cache — P3-2", () => {
  beforeEach(async () => {
    await invalidateStartupsList();
  });

  it("returns null on a cold key", async () => {
    expect(await getCachedStartupsList(nextPage(), 50)).toBeNull();
  });

  it("round-trips a cached page", async () => {
    const page = nextPage();
    const data = payload("abc");
    await setCachedStartupsList(page, 50, data);
    expect(await getCachedStartupsList(page, 50)).toEqual(data);
  });

  it("keys pages independently by page and limit", async () => {
    const page = nextPage();
    await setCachedStartupsList(page, 50, payload("page-50"));
    await setCachedStartupsList(page, 25, payload("page-25"));

    expect(await getCachedStartupsList(page, 50)).toEqual(payload("page-50"));
    expect(await getCachedStartupsList(page, 25)).toEqual(payload("page-25"));
    expect(await getCachedStartupsList(page, 10)).toBeNull();
  });

  it("invalidateStartupsList drops every cached page (admin insert path)", async () => {
    const pageA = nextPage();
    const pageB = nextPage();
    await setCachedStartupsList(pageA, 50, payload("a"));
    await setCachedStartupsList(pageB, 50, payload("b"));

    await invalidateStartupsList();

    expect(await getCachedStartupsList(pageA, 50)).toBeNull();
    expect(await getCachedStartupsList(pageB, 50)).toBeNull();
  });

  it("re-caches after invalidation (index is rebuilt, not left stale)", async () => {
    const page = nextPage();
    await setCachedStartupsList(page, 50, payload("first"));
    await invalidateStartupsList();
    await setCachedStartupsList(page, 50, payload("second"));

    expect(await getCachedStartupsList(page, 50)).toEqual(payload("second"));
    // The rebuilt index must still invalidate the new entry.
    await invalidateStartupsList();
    expect(await getCachedStartupsList(page, 50)).toBeNull();
  });

  it("degrades to a miss on a corrupt cached value instead of throwing", async () => {
    const page = nextPage();
    await getRedisClient().set(`startups:list:${page}:50`, "{ not json", 60);

    await expect(getCachedStartupsList(page, 50)).resolves.toBeNull();
  });

  it("does not throw when the backing store rejects (cache is best-effort)", async () => {
    kvState.failWrites = true;
    try {
      await expect(
        setCachedStartupsList(nextPage(), 50, payload("boom")),
      ).resolves.toBeUndefined();
    } finally {
      kvState.failWrites = false;
    }
  });
});