"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDashboardStore } from "@/lib/state/store";
import type { Filters, ViewMode } from "@/lib/types/startup";
import { VIEW_MODES } from "@/components/utils/constants";

const VALID_VIEWS: readonly string[] = VIEW_MODES;

interface UrlState {
  view: ViewMode;
  search: string;
  filters: Filters;
}

/** Read + validate the 5 URL params. Invalid values are ignored. */
function parseParams(sp: URLSearchParams): Partial<UrlState> {
  const out: Partial<UrlState> = {};

  const view = sp.get("view");
  if (view && VALID_VIEWS.includes(view)) out.view = view as ViewMode;

  const q = sp.get("q");
  if (q) out.search = q;

  const filters: Partial<Filters> = {};
  const area = sp.get("area");
  if (area) filters.area = area;
  const sector = sp.get("sector");
  if (sector) filters.sector = sector;
  const stage = sp.get("stage");
  if (stage) filters.stage = stage as Filters["stage"];

  if (Object.keys(filters).length > 0) {
    out.filters = {
      area: filters.area ?? null,
      sector: filters.sector ?? null,
      stage: filters.stage ?? null,
    };
  }

  return out;
}

/** Build a minimal query string from store state (omit defaults/nulls). */
function buildQueryString(state: UrlState): string {
  const sp = new URLSearchParams();
  if (state.view !== "map") sp.set("view", state.view);
  if (state.search) sp.set("q", state.search);
  if (state.filters.area) sp.set("area", state.filters.area);
  if (state.filters.sector) sp.set("sector", state.filters.sector);
  if (state.filters.stage) sp.set("stage", state.filters.stage);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * URL ⇄ store sync for the dashboard state.
 *
 * Read: once on mount, seed the store from `?view&q&area&sector&stage`.
 * Write: on every store change, `router.replace` the URL (replace, not push —
 * back/forward stays clean). The store stays the single source of truth; the
 * URL is a derived, shareable projection.
 */
export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read once on mount: URL → store (imperative apply, no re-render loop).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const raw = searchParams.toString();
    if (!raw) return;
    const parsed = parseParams(new URLSearchParams(raw));
    const { setView, setSearch, setFilter } = useDashboardStore.getState();
    if (parsed.view) setView(parsed.view);
    if (parsed.search) setSearch(parsed.search);
    if (parsed.filters) {
      if (parsed.filters.area) setFilter("area", parsed.filters.area);
      if (parsed.filters.sector) setFilter("sector", parsed.filters.sector);
      if (parsed.filters.stage) setFilter("stage", parsed.filters.stage);
    }
    // Runs once; searchParams is captured at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write: store → URL
  const view = useDashboardStore((s) => s.view);
  const search = useDashboardStore((s) => s.search);
  const filters = useDashboardStore((s) => s.filters);

  const first = useRef(true);
  useEffect(() => {
    // Skip the initial run so mount doesn't clobber the seeded URL
    // (also drops the URL entirely when state equals defaults — clean URL).
    if (first.current) {
      first.current = false;
      return;
    }
    const qs = buildQueryString({ view, search, filters });
    const current = searchParams.toString();
    const next = qs.startsWith("?") ? qs.slice(1) : "";
    if (next === current) return;
    router.replace(qs ? `${pathname}${qs}` : pathname, { scroll: false });
    // searchParams intentionally excluded: we compare via toString() to avoid
    // re-running on our own replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, filters, pathname, router]);
}
