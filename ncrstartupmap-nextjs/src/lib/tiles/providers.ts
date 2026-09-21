// -----------------------------------------------------------------------------
// Tile provider registry — single source of truth for the map tile proxy.
//
// Fallback strategy (strict priority, exactly ONE active provider at a time):
//   1. MapTiler "streets-v2"  — primary look (server-side key)
//   2. Mapbox  "light-v11"    — first fallback (server-side token)
//   3. OpenStreetMap          — emergency fallback, always present
//
// Fallbacks trigger ONLY on quota/auth failures (HTTP non-200, e.g. 429/403)
// or network errors/timeouts — NEVER based on zoom level. The sticky circuit
// breaker below swaps the ACTIVE provider for all clients at once, so the map
// is always rendered by exactly one provider (no per-tile mixing).
// -----------------------------------------------------------------------------
export type TileProviderName = "maptiler" | "mapbox" | "osm";

export interface UpstreamProvider {
  name: TileProviderName;
  url: string;
  /** Bound the upstream call — a stalled provider must not hold the request open. */
  timeoutMs: number;
  /**
   * Deepest zoom level at which this provider serves real (native) tiles.
   * Leaflet over-zooms tiles beyond this instead of requesting non-existent
   * deeper tiles (the "white screen at max zoom" bug). The client mirrors
   * this value via /api/tiles/status.
   */
  maxNativeZoom: number;
}

/** Uniform max zoom for the map + every provider — never lock out zooming. */
export const TILE_MAX_ZOOM = 22;

const MAPTILER_TIMEOUT_MS = 3_500;
const MAPBOX_TIMEOUT_MS = 3_500;
// OSM keeps the original 5s budget from the pre-migration proxy so a stalled
// OSM still can't hang the request.
const OSM_TIMEOUT_MS = 5_000;

const OSM_TILE_URL = "https://tile.openstreetmap.org";

// Keys are read at request time (not module init) so a Vercel env change takes
// effect without a rebuild. They are server-only (no NEXT_PUBLIC_ prefix). A
// provider with an empty key is skipped entirely; OSM always sits at the end
// of the chain so the map never goes dark while keys are provisioned/rotated.
function readProviderKeys(): { maptiler?: string; mapbox?: string } {
  return {
    maptiler: process.env.MAPTILER_API_KEY || undefined,
    mapbox: process.env.MAPBOX_ACCESS_TOKEN || undefined,
  };
}

// -----------------------------------------------------------------------------
// Sticky failover (circuit breaker): when a provider fails (non-200, timeout),
// ALL subsequent requests skip it for a cooldown window instead of failing
// per-tile. This guarantees the fallback replaces the active provider across
// the whole map — never a patchwork of two providers visible simultaneously.
// In-memory only: resets on server restart/redeploy, which is safe because
// each provider is re-probed naturally as soon as the cooldown expires.
// -----------------------------------------------------------------------------
const FAIL_COOLDOWN_MS = 60_000;
const providerFailures = new Map<TileProviderName, number>();

function isProviderDown(name: TileProviderName): boolean {
  const failUntil = providerFailures.get(name);
  return typeof failUntil === "number" && failUntil > Date.now();
}

function markProviderDown(name: TileProviderName): void {
  providerFailures.set(name, Date.now() + FAIL_COOLDOWN_MS);
}

export function buildUpstreamChain(
  z: string,
  x: string,
  y: string,
): UpstreamProvider[] {
  const chain: UpstreamProvider[] = [];
  const keys = readProviderKeys();

  // Providers in an active failure cooldown are skipped so the map switches
  // to the fallback UNIFORMLY (all tiles, all zooms) instead of mixing.
  if (keys.maptiler && !isProviderDown("maptiler")) {
    chain.push({
      name: "maptiler",
      url: `https://api.maptiler.com/maps/streets-v2/256/${z}/${x}/${y}.png?key=${keys.maptiler}`,
      timeoutMs: MAPTILER_TIMEOUT_MS,
      // MapTiler streets-v2 raster native coverage.
      maxNativeZoom: 20,
    });
  }

  if (keys.mapbox && !isProviderDown("mapbox")) {
    chain.push({
      name: "mapbox",
      url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/${z}/${x}/${y}?access_token=${keys.mapbox}`,
      timeoutMs: MAPBOX_TIMEOUT_MS,
      // Mapbox raster styles serve native tiles far deeper than users zoom.
      maxNativeZoom: 22,
    });
  }

  // Emergency fallback — always last, never skipped.
  chain.push({
    name: "osm",
    url: `${OSM_TILE_URL}/${z}/${x}/${y}.png`,
    timeoutMs: OSM_TIMEOUT_MS,
    // Standard OSM raster tiles stop at z19; deeper zooms over-zoom z19 tiles.
    maxNativeZoom: 19,
  });

  return chain;
}

/** The provider currently serving tiles (head of the breaker-aware chain). */
export function getActiveProvider(): UpstreamProvider {
  // Coordinates are irrelevant for identifying the head of the chain.
  return buildUpstreamChain("0", "0", "0")[0];
}

export { isProviderDown, markProviderDown };