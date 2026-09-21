import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { buildPopupHTML } from "@/components/views/MapView/buildPopup";
import { sanitizeInput } from "@/lib/security/sanitize";
import type { Startup } from "@/lib/types/startup";

const NCR_CENTER: [number, number] = [28.55, 77.2];
const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 8; // Prevent zooming out beyond NCR region

// --- Tile provider zoom metadata (mirrors @/lib/tiles/providers.ts) ---------
// Exactly ONE provider is active at a time (server-side sticky failover fires
// only on quota/auth/network errors — never per zoom level). /api/tiles/status
// reports the active provider and its maxNativeZoom; until that response lands
// we optimistically assume the primary (MapTiler).
const TILE_MAX_ZOOM = 22; // uniform cap — deep zooms over-zoom, never lock out
const PRIMARY_TILE_PROVIDER = "maptiler";
const PRIMARY_MAX_NATIVE_ZOOM = 20;
const tileUrlFor = (provider: string): string =>
  `/api/tiles/{z}/{x}/{y}?v=${provider}`;

// NCR region bounds — restricts panning so users can't lose the map
const NCR_BOUNDS: L.LatLngBoundsExpression = [
  [28.28, 76.82], // South-West (Faridabad, Gurugram)
  [28.88, 77.45], // North-East (Delhi, Ghaziabad, Noida)
];

function markerClass(isHiring: boolean | null): string {
  if (isHiring === true) return "startup-marker startup-marker--hiring";
  if (isHiring === false) return "startup-marker startup-marker--not-hiring";
  return "startup-marker startup-marker--unconfirmed";
}

export default function Map({ startups }: { startups: Startup[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  // Pre-compute marker data for all startups (used for both clustering and filtering).
  const markerData = useMemo(() => {
    return startups
      .filter((s) => s.lat !== null && s.lng !== null)
      .map((s) => ({
        startup: s,
        lat: s.lat as number,
        lng: s.lng as number,
      }));
  }, [startups]);

  // Initialize Leaflet exactly once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: NCR_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: TILE_MAX_ZOOM, // uniform with tile layer — no zoom lock-out
      maxBounds: NCR_BOUNDS,
      zoomControl: true,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
    });

    // Attribution stack covers every provider in the proxy's fallback chain
    // (MapTiler → Mapbox → OSM) — the client can't know per-tile which one
    // served (X-Tile-Provider), so all three attributions are shown once.
    //
    // SINGLE-PROVIDER GUARANTEE: exactly one L.tileLayer exists on the map.
    // The active provider is part of the URL cache key (?v=<provider>) and
    // tiles are served immutable for 90 days, so tiles from two providers can
    // never coexist under one URL — a provider swap changes EVERY tile URL,
    // forcing one uniform provider set (no mixing across zoom levels).
    // maxNativeZoom over-zooms the active provider's deepest native tiles so
    // fully zoomed-in views render stretched tiles, never a white screen.
    const tileLayer = L.tileLayer(tileUrlFor(PRIMARY_TILE_PROVIDER), {
      attribution:
        '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer noopener">MapTiler</a> &copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer noopener">Mapbox</a> &copy; <a href="http://osm.org/copyright" target="_blank" rel="noreferrer noopener">OpenStreetMap</a>',
      maxZoom: TILE_MAX_ZOOM,
      maxNativeZoom: PRIMARY_MAX_NATIVE_ZOOM,
      minZoom: 3,
      tileSize: 256,
      zoomOffset: 0,
      updateWhenIdle: true,
      keepBuffer: 2,
      detectRetina: false,
      crossOrigin: true,
    });

    // Remove loading="lazy" from tiles so they load immediately (improves LCP).
    tileLayer.on("tileload", (e: L.TileEvent) => {
      const img = e.tile as HTMLImageElement;
      img.loading = "eager";
      img.setAttribute("fetchpriority", "high");
    });

    // --- Dynamic provider sync (single active provider) ---------------------
    // The proxy swaps its ACTIVE provider only on quota/auth/network failures
    // (sticky 60s breaker) — never per zoom level. The client mirrors that
    // decision: fetch the active provider, then swap the tile URL (?v=
    // <provider> cache key) and maxNativeZoom together and redraw, so the
    // whole map switches in one stroke and deep zooms over-zoom the new
    // provider's native tiles instead of rendering blank/white tiles.
    let activeProvider = PRIMARY_TILE_PROVIDER;
    let statusInFlight = false;
    let statusRetryNotBefore = 0;

    const applyTileStatus = (status: {
      provider?: string;
      maxNativeZoom?: number;
    }): void => {
      if (!status.provider || typeof status.maxNativeZoom !== "number") return;
      tileLayer.options.maxNativeZoom = status.maxNativeZoom;
      if (status.provider !== activeProvider) {
        activeProvider = status.provider;
        // setUrl() redraws every tile: uniform provider switch, no mixing.
        tileLayer.setUrl(tileUrlFor(activeProvider));
        console.info(
          `[Map] tile provider switched to ${activeProvider} (maxNativeZoom ${status.maxNativeZoom})`,
        );
      }
    };

    const refreshTileStatus = (): void => {
      if (statusInFlight) return;
      statusInFlight = true;
      fetch("/api/tiles/status")
        .then(
          (
            res,
          ): Promise<{ provider?: string; maxNativeZoom?: number } | null> =>
            res.ok ? res.json() : Promise.resolve(null),
        )
        .then((status) => {
          if (status) applyTileStatus(status);
        })
        .catch(() => {
          // Status endpoint is best-effort; the proxy chain still serves tiles.
        })
        .finally(() => {
          statusInFlight = false;
        });
    };

    refreshTileStatus();

    // Client-side visibility for proxy fallbacks: a failed tile means either
    // the whole chain failed (network drop / 502) or the proxy just switched
    // its active provider (quota exhausted). Re-sync the provider status —
    // throttled to at most once per 15s so a failure burst doesn't spam it.
    tileLayer.on("tileerror", (e: L.TileErrorEvent) => {
      console.warn("[Map] tile failed from proxy chain", e.error ?? e.tile);
      const now = Date.now();
      if (now < statusRetryNotBefore) return;
      statusRetryNotBefore = now + 15_000;
      refreshTileStatus();
    });

    tileLayer.addTo(map);

    // Marker clustering with viewport-aware marker creation.
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 10,
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    map.addLayer(clusterGroup);
    clusterRef.current = clusterGroup;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // Build markers once per dataset. Leaflet.markercluster culls off-screen
  // markers internally, so no viewport filtering or moveend rebuild is needed.
  // Rebuilding on moveend destroyed the open popup's marker (autoPan triggers
  // moveend), which is why edge cards flashed closed.
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    const createMarker = (startup: Startup, lat: number, lng: number) => {
      const icon = L.divIcon({
        className: "",
        html: `<span class="${markerClass(startup.is_hiring)}" style="display:block;width:20px;height:20px"></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      return L.marker([lat, lng], {
        icon,
        title: sanitizeInput(startup.name),
        alt: sanitizeInput([startup.name, startup.area].filter(Boolean).join(", ")),
        keyboard: true,
      }).bindPopup(buildPopupHTML(startup), {
        minWidth: 280,
        maxWidth: 280,
        // Keep the open card fully visible when it would overflow the edge.
        keepInView: true,
        autoPanPaddingTopLeft: L.point(16, 16),
        // Extra bottom room so the card never slides under the ad-strip overlay.
        autoPanPaddingBottomRight: L.point(16, 120),
      });
    };

    cluster.clearLayers();
    cluster.addLayers(
      markerData.map(({ startup, lat, lng }) => createMarker(startup, lat, lng)),
    );
  }, [markerData]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map of NCR startups"
      className="h-full w-full"
    />
  );
}
