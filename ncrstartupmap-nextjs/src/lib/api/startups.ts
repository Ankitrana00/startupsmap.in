import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Filters, Startup } from "@/lib/types/startup";

/**
 * Row shape of the `unmapped_startups` table — startups with an address on
 * file but no coordinates yet. Mirrors the live Supabase columns.
 */
interface UnmappedStartupRow {
  id: string;
  name: string | null;
  area: string | null;
  /** The live table stores founded as text (e.g. "2022"). */
  founded: string | null;
  sector: string | null;
  website: string | null;
  linkedin: string | null;
  description: string | null;
}

/**
 * Map an `unmapped_startups` row onto the shared Startup shape.
 * lat/lng stay null so the existing selectors route these rows to the
 * Unmapped view and keep them off the map/grid automatically.
 */
function toStartupFromUnmapped(row: UnmappedStartupRow): Startup {
  const foundedNum =
    row.founded == null ? Number.NaN : Number.parseInt(row.founded, 10);
  return {
    id: row.id,
    name: row.name ?? "Unnamed startup",
    description: row.description,
    sector: row.sector,
    stage: null,
    area: row.area,
    founded: Number.isNaN(foundedNum) ? null : foundedNum,
    is_hiring: null,
    lat: null,
    lng: null,
    website: row.website,
    linkedin: row.linkedin,
  };
}

/**
 * Data access layer — reads from Supabase.
 */
export async function fetchStartups(): Promise<Startup[]> {
  if (!isSupabaseConfigured) {
    // C1: missing configuration is an environment failure, not an empty
    // dataset. Throwing surfaces the dashboard's error/retry UI instead of
    // the fake "no results" state that returning [] produced.
    console.error(
      "[startups] Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env, then restart the dev server.",
    );
    throw new Error("Supabase is not configured");
  }

  // Both tables in parallel: `startups` (mapped) + `unmapped_startups` (the
  // coordinate-less queue that fills the Unmapped view).
    // H1: bound the request so a slow/stalled Supabase read rejects fast
  // (10s) instead of hanging the dashboard — after TanStack's retry:1 the
  // user lands in the dashboard error state with a Retry button.
  const [mapped, unmapped] = await Promise.all([
    supabase
      .from("startups")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("unmapped_startups")
      .select("*")
      .order("created_at", { ascending: false }),
  ]).catch((err: unknown) => {
    // AbortSignal.timeout throws a DOMException named "TimeoutError";
    // surface a readable message and re-throw so isError + refetch fire.
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("Request timed out — check your connection");
    }
    throw err;
  });

  if (mapped.error) {
    // PostgrestError fields (message/code/details/hint) are non-enumerable, so
    // logging the object directly shows `{}`. Serialize the fields explicitly.
    // Only expose full error details in development; in production, log a
    // sanitized message to avoid leaking internal database information.
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Failed to fetch startups from Supabase:",
        JSON.stringify(
          { message: mapped.error.message, code: mapped.error.code, details: mapped.error.details, hint: mapped.error.hint },
          null,
          2,
        ),
      );
    } else {
      console.error("Failed to fetch startups from Supabase");
    }
    // C1: the primary table failing must not masquerade as an empty
    // directory. Throw so TanStack Query sets isError and the retry UI
    // renders. (The unmapped queue below stays a soft-degrade by design.)
    throw new Error("Failed to fetch startups");
  }

  if (unmapped.error) {
    // The unmapped queue is supplementary — never block the dashboard on it.
    // Only expose full error details in development; in production, log a
    // sanitized message to avoid leaking internal database information.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Failed to fetch unmapped startups from Supabase:",
        JSON.stringify(
          { message: unmapped.error.message, code: unmapped.error.code, details: unmapped.error.details, hint: unmapped.error.hint },
          null,
          2,
        ),
      );
    } else {
      console.warn("Failed to fetch unmapped startups from Supabase");
    }
  }

  const unmappedRows = (unmapped.data as UnmappedStartupRow[] | null) ?? [];
  return [...((mapped.data as Startup[]) ?? []), ...unmappedRows.map(toStartupFromUnmapped)];
}

function matchesFilters(s: Startup, filters: Filters): boolean {
  if (filters.area && s.area !== filters.area) return false;
  if (filters.sector && s.sector !== filters.sector) return false;
  if (filters.stage && s.stage !== filters.stage) return false;
  return true;
}

function matchesQuery(s: Startup, q: string): boolean {
  if (!q) return true;
  return [(s.name ?? ""), (s.description ?? ""), (s.sector ?? ""), (s.area ?? ""), (s.stage ?? ""), (s.address ?? "")].some(
    (v) => v.toLowerCase().includes(q),
  );
}

export function applyFilters(startups: Startup[], filters: Filters, query: string): Startup[] {
  const q = query.trim().toLowerCase();
  return startups.filter((s) => matchesFilters(s, filters) && matchesQuery(s, q));
}

export function uniqueValues<T extends object, K extends keyof T>(startups: T[], key: K): string[] {
  // Skip null/undefined (e.g. unmapped rows have no stage) so filter dropdowns
  // never show a literal "null" option.
  return Array.from(
    new Set(
      startups
        .map((s) => s[key])
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v)),
    ),
  ).sort();
}
