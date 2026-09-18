import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { MapLegend } from "@/components/views/MapView/MapLegend";
import { MapSkeleton } from "@/components/shared/loading/MapSkeleton";
import { AdCarouselWrapper } from "@/components/carousel/AdCarouselWrapper";
import { selectCounts, selectMapped } from "@/lib/state/selectors";
import { cn } from "@/lib/utils";
import type { Startup } from "@/lib/types/startup";

export interface MapPanelProps {
  startups: Startup[];
  ads?: { id: string; image?: string; title: string; link: string; isPromo?: boolean }[];
  className?: string;
  /**
   * When false, the Leaflet chunk is never fetched — the panel renders the
   * skeleton shell (legend + layout box) only. DashboardContent passes
   * `view === "map"`, so Grid/Unmapped users skip ~150KB of Leaflet JS.
   * Switching back to Map flips this true and the import fires on demand.
   */
  active?: boolean;
}

// L3: per-tab-tab-session persistence. sessionStorage (not localStorage) keeps
// the audit's "session-scoped" intent — a reload or remount respects the
// dismissal, a new tab/window starts fresh. Wrapped like persistence.ts.
const ADS_DISMISSED_KEY = "ncr-startup-map-ads-dismissed:v1";

function readAdsDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ADS_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function MapPanel({ startups, ads, className, active = true }: MapPanelProps) {
  const [MapComponent, setMapComponent] = useState<
    ComponentType<{ startups: Startup[] }> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // L3: initialize from sessionStorage so a remount/reload within the same
  // tab keeps the ad hidden (previously component state resurrected it).
  const [adsDismissed, setAdsDismissed] = useState(readAdsDismissed);
  const [retryKey, setRetryKey] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const MAX_RETRIES = 3;

  // Leaflet touches `window` at import time — load the map module only in the
  // browser AND only when the map view is actually active. Grid/Unmapped
  // users never download the ~150KB Leaflet chunk. When the user switches
  // back to Map, `active` flips true and this effect fires the import.
  // retryKey re-triggers the import without losing filter/search state
  // (unlike window.location.reload()).
  useEffect(() => {
    if (typeof window === "undefined" || !active) return;
    let cancelled = false;
    import("@/components/views/MapView/Map")
      .then((mod) => {
        if (!cancelled) setMapComponent(() => mod.default);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err?.message ?? String(err));
          console.error("[MapPanel] failed to load map:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey, active]);

  const retry = () => {
    setLoadError(null);
    setMapComponent(null);
    setAttempts((n) => n + 1);
    setRetryKey((k) => k + 1);
  };

  // L3: persist the dismissal so it survives remounts/reloads in this tab.
  const dismissAds = () => {
    setAdsDismissed(true);
    try {
      sessionStorage.setItem(ADS_DISMISSED_KEY, "1");
    } catch {
      // Private mode / storage quota — dismissal stays component-scoped,
      // exactly the pre-L3 behavior.
    }
  };

  const mapped = useMemo(() => selectMapped(startups), [startups]);
  const counts = useMemo(() => selectCounts(mapped), [mapped]);

  return (
    <div
      data-testid="map-panel"
      className={cn("relative h-full min-h-0 w-full overflow-hidden rounded-xl border border-border max-md:min-h-56 md:h-[calc(100vh-11rem)] md:min-h-104", className)}
    >
      {loadError ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-sm">
          <span className="text-destructive">Map failed to load.</span>
          {attempts < MAX_RETRIES ? (
            <button
              type="button"
              onClick={retry}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary"
            >
              Retry{attempts > 0 ? ` (${MAX_RETRIES - attempts} left)` : ""}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary"
            >
              Reload page
            </button>
          )}
        </div>
      ) : MapComponent ? (
        <MapComponent startups={mapped} />
      ) : (
        <MapSkeleton />
      )}
      <MapLegend counts={counts} />
      {/* Ads overlay (3C/3D): hidden once dismissed for the session, and never
          rendered over a failed map (loadError). Placement unchanged. */}
      {ads && ads.length > 0 && !loadError && !adsDismissed && (
        <div className="absolute bottom-3 right-3 z-[500] w-[calc(100%-148px)] max-w-56 md:bottom-7 md:left-1/2 md:right-auto md:w-full md:max-w-90 md:-translate-x-1/2 md:px-2">
          <div className="panel relative overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={dismissAds}
              aria-label="Dismiss advertisements"
              className="absolute right-1 top-1 z-10 rounded-full bg-surface-raised/90 px-1.5 py-0.5 text-xs font-semibold leading-none text-foreground opacity-80 transition-opacity hover:opacity-100"
            >
              ✕
            </button>
            <AdCarouselWrapper ads={ads} />
          </div>
        </div>
      )}
    </div>
  );
}
