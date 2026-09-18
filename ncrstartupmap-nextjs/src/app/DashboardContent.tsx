"use client";

import { useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FilterDropdown } from "@/components/toolbar/FilterDropdown";
import { LogoButton } from "@/components/toolbar/LogoButton";
import { MobileCountBadge } from "@/components/toolbar/MobileCountBadge";

import { MobileToolbar } from "@/components/toolbar/MobileToolbar";
import { SearchBox } from "@/components/toolbar/SearchBox";
import { ToolbarContainer } from "@/components/toolbar/ToolbarContainer";
import { ViewToggle } from "@/components/toolbar/ViewToggle";
import { EmptyState } from "@/components/shared/EmptyState";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { MapSkeleton } from "@/components/shared/loading/MapSkeleton";
import { StartupCardSkeleton } from "@/components/shared/loading/StartupCardSkeleton";
import { GridContainer } from "@/components/views/GridView/GridContainer";
import { UnmappedList } from "@/components/views/UnmappedView/UnmappedList";
import { applyFilters, uniqueValues } from "@/lib/api/startups";
import { reportClientError } from "@/lib/error/report-client-error";
import { useStartups } from "@/lib/hooks/useStartups";
import { useFilterParams } from "@/lib/hooks/useFilterParams";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { selectMapped, selectUnmapped } from "@/lib/state/selectors";
import { useDashboardStore } from "@/lib/state/store";
import type { StartupStage } from "@/lib/types/startup";
import { cn } from "@/lib/utils";


const MapPanel = dynamic(
  () => import("@/components/views/MapView/MapPanel").then((mod) => mod.MapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-13rem)] min-h-104 w-full overflow-hidden rounded-xl border border-border max-md:h-full max-md:min-h-0 md:h-[calc(100vh-11rem)]">
        <MapSkeleton />
      </div>
    ),
  },
);

export function DashboardContent() {
  useFilterParams();
  // M5 step 2: layout is CSS-only — both shells render server-side and
  // visibility is `max-md:hidden` / `hidden max-md:block`. No JS decides the
  // shell any more. useIsMobile had no behavioral callers (verified: the
  // layout branch was its only consumer) and the hook was removed.
  const { data, isPending, isError, refetch } = useStartups();
  const startups = useMemo(() => data ?? [], [data]);
  const view = useDashboardStore((s) => s.view);
  const search = useDashboardStore((s) => s.search);
  const filters = useDashboardStore((s) => s.filters);
  const setView = useDashboardStore((s) => s.setView);
  const setSearch = useDashboardStore((s) => s.setSearch);
  const setFilter = useDashboardStore((s) => s.setFilter);
  const resetFilters = useDashboardStore((s) => s.resetFilters);

  // H2: SSR-safe online indicator. Banner only renders when offline AND
  // the client has read navigator.onLine (isHydrated) — keeps SSR output
  // clean and avoids a flash of the banner to online users.
  const { online, isHydrated } = useNetworkStatus();

  const areas = useMemo(() => uniqueValues(startups, "area"), [startups]);
  const sectors = useMemo(() => uniqueValues(startups, "sector"), [startups]);
  const stages = useMemo(() => uniqueValues(startups, "stage"), [startups]);

  // Ads strip — all cards link to the promote page until real ad inventory exists.
  const ads = useMemo(
    () => [
      {
        id: "ad-1",
        title: "Explore NCR Startups",
        link: "/promote",
        isPromo: true,
      },
      {
        id: "ad-2",
        title: "Discover Local Talent",
        link: "/promote",
        isPromo: true,
      },
      {
        id: "ad-promote",
        title: "Promote",
        link: "/promote",
        isPromo: true,
      },
    ],
    [],
  );

  const filtered = useMemo(
    () => applyFilters(startups, filters, search),
    [startups, filters, search],
  );
  // View-aware totals: map + grid show the mappable set (what the map renders),
  // unmapped shows only the coordinate-less set (what its list renders).
  const mappedFiltered = useMemo(() => selectMapped(filtered), [filtered]);
  const unmappedFiltered = useMemo(() => selectUnmapped(filtered), [filtered]);
  // Stable signature for list pagination reset (U3): fires "Show more" reset
  // only when the actual filter/search/dataset state changes.
  const listResetKey = useMemo(
    () =>
      `${search}:${filters.area}:${filters.sector}:${filters.stage}:${startups.length}`,
    [search, filters.area, filters.sector, filters.stage, startups.length],
  );
  const viewStartups = view === "unmapped" ? unmappedFiltered : mappedFiltered;
  const total = viewStartups.length;
  const hasActiveFilters =
    search !== "" || filters.area !== null || filters.sector !== null || filters.stage !== null;


  // Shared view content — M5: ONE server-rendered node for every breakpoint.
  // ≥768px it stays in-flow under the desktop toolbar; <768px it becomes the
  // fixed full-height mobile layer (top derives from the toolbar tokens —
  // same arithmetic the old JS-positioned wrapper used, 16px below the box).
  // `fullHeight` is gone: there is no JS branch left to feed it.
  const renderViewContent = () => (
    <section
      className={cn(
        "mt-4 min-h-[calc(100vh-11rem)]",
        "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-0 max-md:mt-0 max-md:min-h-0",
        "max-md:top-[calc(env(safe-area-inset-top)+var(--mobile-toolbar-top)+var(--mobile-toolbar-min-h)+16px)]",
        view === "map"
          ? "max-md:overflow-hidden"
          : "max-md:overflow-x-hidden max-md:overscroll-contain max-md:overflow-y-auto max-md:pb-16",
      )}
    >
      {isPending ? (
        view === "map" ? (
          <div className="h-full min-h-0 w-full overflow-hidden md:h-[calc(100vh-11rem)] md:min-h-104 md:rounded-xl md:border md:border-border">
            <MapSkeleton />
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-label="Loading startups"
          >
            {/* L4: single source of truth for the card skeleton (the inline
                copy that drifted from StartupCardSkeleton is gone). */}
            {Array.from({ length: 8 }, (_, i) => (
              <StartupCardSkeleton key={i} />
            ))}
          </div>
        )
      ) : isError ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load startups.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : viewStartups.length === 0 ? (
        <div>
          {/* M8: distinguish "nothing matches your filters" from an empty
              directory. Unfiltered-empty is the honest no-data state and
              offers the natural conversion path (submit). Filtered-empty
              keeps the exact prior copy — e2e asserts it. */}
          <EmptyState
            announce
            message={
              hasActiveFilters
                ? view === "unmapped"
                  ? "Every startup in this selection is on the map."
                  : "No startups match these filters."
                : "No startups listed yet."
            }
          />
          {hasActiveFilters ? (
            <div className="flex justify-center pb-8">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="flex justify-center pb-8">
              <Link
                href="/submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Submit your startup
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {view === "map" && (
            <MapPanel
              startups={mappedFiltered}
              ads={ads}
              active={view === "map"}
            />
          )}
          {view === "grid" && <GridContainer startups={mappedFiltered} resetKey={listResetKey} />}
          {view === "unmapped" && <UnmappedList startups={unmappedFiltered} resetKey={listResetKey} />}
        </>
      )}
    </section>
  );

  return (
    <div className="grid-backdrop min-h-screen">
      <ErrorBoundary
        onError={(error, info) =>
          reportClientError(error, {
            componentStack: info.componentStack,
            route: typeof window !== "undefined" ? window.location.pathname : undefined,
            view,
          })
        }
        onReset={() => refetch()}
        resetKeys={[view, listResetKey]}
        fallbackRender={({ resetErrorBoundary }) => (
          <main className="mx-auto max-w-440 px-4 py-4">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                Something went wrong while rendering the dashboard.
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                You can try again — if it keeps failing, refresh the page.
              </p>
              <button
                type="button"
                onClick={resetErrorBoundary}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Try again
              </button>
            </div>
          </main>
        )}
      >
        {/* H2: persistent offline notice — only when offline AND client has
            read navigator.onLine (no SSR flash, no layout shift on load). */}
        {!online && isHydrated && <OfflineBanner isHydrated={isHydrated} />}

        {/* M5 step 1: both shells render server-side; visibility is pure CSS.
            The mobile chrome (toolbar + count badge) is display:none ≥768px,
            the desktop chrome is display:none <768px, and the view content is
            ONE shared node restyled per breakpoint (see renderViewContent).
            No JS decides layout any more — no desktop flash on mobile. */}
        <div className="hidden max-md:block" data-testid="toolbar-mobile">
          <MobileToolbar areas={areas} sectors={sectors} stages={stages as StartupStage[]} />
        </div>
        {!isPending && !isError && total > 0 && (
          <div className="hidden max-md:block">
            <MobileCountBadge total={total} />
          </div>
        )}
        <main className="mx-auto max-w-440 px-4 py-4 max-md:px-0 max-md:py-0">
          <div className="max-md:hidden" data-testid="toolbar-desktop">
            <ToolbarContainer>
              <LogoButton />
              <ViewToggle view={view} onChange={setView} />
              <SearchBox value={search} onChange={setSearch} id="search-input" className="min-w-0 lg:max-w-72 lg:flex-1" />
              <FilterDropdown
                label="Area"
                value={filters.area}
                options={areas}
                onSelect={(value) => setFilter("area", value)}
              />
              <FilterDropdown
                label="Sector"
                value={filters.sector}
                options={sectors}
                onSelect={(value) => setFilter("sector", value)}
              />
              <FilterDropdown<StartupStage>
                label="Stage"
                value={filters.stage}
                options={stages as StartupStage[]}
                onSelect={(value) => setFilter("stage", value)}
              />
              {/* L1: no `!isPending` gate — clearing filters mid-refetch is safe
                  (applyFilters handles empty data) and the button vanishing during
                  a refetch was itself the defect. */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <Link
                href="/submit"
                className="w-full rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto lg:ml-auto lg:w-auto"
              >
                Submit a startup
              </Link>
            </ToolbarContainer>
          </div>

          {!isPending && !isError && total > 0 && (
            <div className="mt-4 flex max-md:hidden justify-center">
              <p
                role="status"
                className="panel rounded-full px-5 py-1.5 font-display text-sm font-semibold text-foreground tabular-nums"
              >
                {total} {total === 1 ? "startup" : "startups"}
              </p>
            </div>
          )}

          {renderViewContent()}
        </main>
      </ErrorBoundary>
    </div>
  );
}
