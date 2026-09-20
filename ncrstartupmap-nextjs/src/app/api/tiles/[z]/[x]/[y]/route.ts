import { NextRequest, NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";
import { log } from "@/lib/logging/logger";
import { createLimiter } from "@/lib/limiters";
import { getClientIp } from "@/lib/middleware/ip-utils";

const OSM_TILE_URL = "https://tile.openstreetmap.org";
// 90 days in seconds — OSM standard-layer tiles change rarely and the
// Leaflet map re-requests the same z/x/y on every pan/zoom. Longer max-age
// keeps repeat mobile visits off the network entirely (memory + HTTP cache).
const CACHE_DURATION = 60 * 60 * 24 * 90; // 90 days in seconds

/** P1-5 (audit H3): generous per-IP quota for the proxy. */
const limiter = createLimiter(300, 60 * 1000);

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
  const zoom = parseInt(z, 10);
  if (zoom > 19 || parseInt(x, 10) >= 2 ** zoom || parseInt(y, 10) >= 2 ** zoom) {
    return new NextResponse("Tile coordinates out of range", { status: 400 });
  }

  const url = `${OSM_TILE_URL}/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "StartupsMap.in (https://startupsmap.in)",
      },
      // P1-5 (audit H3): bound the upstream call — a stalled OSM must not
      // hold the request open.
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return new NextResponse("Tile not found", { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${CACHE_DURATION}, immutable`,
        "CDN-Cache-Control": `public, max-age=${CACHE_DURATION}, immutable`,
        "Vercel-CDN-Cache-Control": `public, max-age=${CACHE_DURATION}, immutable`,
      },
    });
  } catch (error) {
    log.error("[api/tiles] Tile proxy error", error);
    reportServerError(error, {
      route: "api/tiles",
      layer: "proxy",
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
    // 502 = upstream (OSM) failure, distinct from our own 5xx.
    return new NextResponse("Upstream tile fetch failed", { status: 502 });
  }
}
