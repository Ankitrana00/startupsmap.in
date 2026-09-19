import { getRedisClient } from "@/lib/cache/redis";
import { log } from "@/lib/logging/logger";

/**
 * P3-2 (audit §3, §8.6): server-side cache for `GET /api/startups`.
 *
 * Every dashboard load used to hit Supabase for the same first page. The
 * paginated response is now cached for 60s — deliberately the same window as
 * the client's `staleTime: 60_000` (src/lib/hooks/useStartups.ts), so the two
 * layers never disagree about freshness.
 *
 * Invalidation: the authorized POST (P0-1) inserts a row, so the cached pages
 * must go. Without a SCAN primitive on the shared client, cached page keys are
 * tracked in a small bounded index (`startups:list:index`) which the write path
 * drains via `DEL`. Reads therefore cost exactly one KV lookup.
 *
 * Backend is the shared client (redis.ts): Upstash in prod, bounded in-memory
 * fallback in dev. Corrupt/missing entries and KV errors degrade to a cache
 * miss — this module never throws into a request path.
 */

export type StartupsListPayload = {
  startups: unknown[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const TTL_SECONDS = 60;
const KEY_PREFIX = "startups:list:";
const INDEX_KEY = "startups:list:index";
/** Index outlives any page's TTL, so every live key stays reachable. */
const INDEX_TTL_SECONDS = 5 * 60;
const MAX_TRACKED_KEYS = 100;

function cacheKey(page: number, limit: number): string {
  return `${KEY_PREFIX}${page}:${limit}`;
}

async function readTrackedKeys(): Promise<string[]> {
  const raw = await getRedisClient().get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    return [];
  }
}

/** Cached page, or null on miss (including any KV/parse error). */
export async function getCachedStartupsList(
  page: number,
  limit: number,
): Promise<StartupsListPayload | null> {
  try {
    const raw = await getRedisClient().get(cacheKey(page, limit));
    if (!raw) return null;
    return JSON.parse(raw) as StartupsListPayload;
  } catch (err) {
    log.debug("[startups-cache] read failed, treating as a miss", err);
    return null;
  }
}

/** Store a page and register its key for later invalidation. */
export async function setCachedStartupsList(
  page: number,
  limit: number,
  payload: StartupsListPayload,
): Promise<void> {
  try {
    const store = getRedisClient();
    const key = cacheKey(page, limit);
    await store.set(key, JSON.stringify(payload), TTL_SECONDS);

    // Newest first, de-duplicated, capped — the index can never grow unbounded.
    const tracked = await readTrackedKeys();
    const next = [key, ...tracked.filter((entry) => entry !== key)].slice(
      0,
      MAX_TRACKED_KEYS,
    );
    await store.set(INDEX_KEY, JSON.stringify(next), INDEX_TTL_SECONDS);
  } catch (err) {
    log.debug("[startups-cache] write failed, continuing uncached", err);
  }
}

/**
 * Drop every cached list page. Called after an authorized insert so the next
 * GET reflects the new row instead of serving the stale page for up to 60s.
 */
export async function invalidateStartupsList(): Promise<void> {
  try {
    const store = getRedisClient();
    const tracked = await readTrackedKeys();
    await Promise.all(tracked.map((key) => store.del(key)));
    await store.del(INDEX_KEY);
    log.info("[startups-cache] invalidated cached list pages", {
      keys: tracked.length,
    });
  } catch (err) {
    log.debug("[startups-cache] invalidation failed", err);
  }
}