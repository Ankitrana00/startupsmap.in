import { NextRequest, NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";
import { log } from "@/lib/logging/logger";
import { createLimiter } from "@/lib/limiters";
import { getClientIp } from "@/lib/middleware/ip-utils";
import {
  buildUpstreamChain,
  markProviderDown,
  TILE_MAX_ZOOM,
} from "@/lib/tiles/providers";

// -----------------------------------------------------------------------------
// Tile proxy — 3-tier server-side fallback chain (strict priority):
//   1. MapTiler "streets-v2"     (primary, server-side key)
//   2. Mapbox "light-v11"        (fallback, server-side token)
//   3. OpenStreetMap standard    (emergency fallback, always present)
//
// Provider metadata (URLs, timeouts, per-provider maxNativeZoom) and the
// sticky failover circuit breaker live in @/lib/tiles/providers so this route
// and /api/tiles/status share ONE source of truth. Fallbacks fire only on
// quota/auth/network failures — never based on zoom level.
// -----------------------------------------------------------------------------

// 90 days in seconds — standard-raster tiles change rarely and the
// Leaflet map re-requests the same z/x/y on every pan/zoom. Longer max-age
// keeps repeat mobile visits off the network entirely (memory + HTTP cache).
const CACHE_DURATION = 60 * 60 * 24 * 90; // 90 days in seconds

/** P1-5 (audit H3): generous per-IP quota for the proxy. */
const limiter = createLimiter(300, 60 * 1000, "tiles");


/** Shared cache headers — preserved unchanged from the pre-migration proxy. */
const TILE_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": `public, max-age=${CACHE_DURATION}, immutable`,
  "CDN-Cache-Control": `public, max-age=${CACHE_DURATION}, immutable`,
  "Vercel-CDN-Cache-Control": `public, max-age=${CACHE_DURATION}, immutable`,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  // P1-5: rate limit before any fetch work.
  const ip = getClientIp(request);
  if (!(await limiter.check(ip))) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(await limiter.retryAfterSeconds(ip)),
      },
    });
  }

  const { z, x, y } = await params;

  // Validate parameters to prevent path traversal
  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return new NextResponse("Invalid tile coordinates", { status: 400 });
  }

  // P1-5 (audit H3): hard bounds on zoom/coordinate ranges — previously
  // z=999 fanned out to the origin. x/y must be < 2^z (valid tile grid).
  // Cap raised to TILE_MAX_ZOOM (22): Mapbox serves native tiles that deep,
  // and lower-native-coverage providers are over-zoomed CLIENT-side via
  // maxNativeZoom, so the proxy only ever receives requests at or below the
  // active provider's native zoom — but the cap must cover the deepest one.
  const zoom = parseInt(z, 10);
  if (
    zoom > TILE_MAX_ZOOM ||
    parseInt(x, 10) >= 2 ** zoom ||
    parseInt(y, 10) >= 2 ** zoom
  ) {
    return new NextResponse("Tile coordinates out of range", { status: 400 });
  }

  const chain = buildUpstreamChain(z, x, y);

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      const response = await fetch(provider.url, {
        headers: {
          "User-Agent": "StartupsMap.in (https://startupsmap.in)",
        },
        signal: AbortSignal.timeout(provider.timeoutMs),
      });

      if (!response.ok) {
        // Last resort reached: preserve the pre-migration passthrough so a
        // genuine 404 (tile out of range) still surfaces as 404, not 502.
        if (provider.name === "osm") {
          return new NextResponse("Tile not found", { status: response.status });
        }
        log.warn(`[api/tiles] ${provider.name} upstream failed (HTTP ${response.status}), falling back`, {
          provider: provider.name,
          status: response.status,
          z,
          x,
          y,
        });
        // Sticky failover: trip the breaker so ALL tiles switch to the next
        // provider for the cooldown window. (OSM never reaches this branch —
        // it returns above as the last resort.)
        markProviderDown(provider.name);
        continue;
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/png";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          // Observability: which provider served this tile and how deep its
          // native coverage goes (the client mirrors maxNativeZoom so deep
          // zooms over-zoom real tiles instead of going blank).
          "X-Tile-Provider": provider.name,
          "X-Tile-Max-Native-Zoom": String(provider.maxNativeZoom),
          ...TILE_CACHE_HEADERS,
        },
      });
    } catch (error) {
      // Timeout (AbortError) or network failure — fall through to the next
      // provider. Only reported to Sentry if the whole chain fails below.
      log.warn(`[api/tiles] ${provider.name} upstream error, falling back`, {
        provider: provider.name,
        error: error instanceof Error ? error.message : String(error),
        z,
        x,
        y,
      });
      // Sticky failover for timeouts/network errors too — a stalled provider
      // must not be re-queried tile-by-tile while it's down (OSM never trips).
      if (provider.name !== "osm") markProviderDown(provider.name);
    }
  }

  // ALL providers failed (MapTiler + Mapbox + OSM). 502 = upstream failure,
  // distinct from our own 5xx.
  const failure = new Error(
    `All upstream tile providers failed (chain: ${chain.map((p) => p.name).join(" → ")})`,
  );
  reportServerError(failure, {
    route: "api/tiles",
    layer: "proxy",
    requestId: request.headers.get("x-request-id") ?? undefined,
  });
  return new NextResponse("Upstream tile fetch failed", { status: 502 });
}
