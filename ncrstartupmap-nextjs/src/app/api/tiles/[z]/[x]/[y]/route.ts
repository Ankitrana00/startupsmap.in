import { NextRequest, NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";

const OSM_TILE_URL = "https://tile.openstreetmap.org";
// 90 days in seconds — OSM standard-layer tiles change rarely and the
// Leaflet map re-requests the same z/x/y on every pan/zoom. Longer max-age
// keeps repeat mobile visits off the network entirely (memory + HTTP cache).
const CACHE_DURATION = 60 * 60 * 24 * 90; // 90 days in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;

  // Validate parameters to prevent path traversal
  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return new NextResponse("Invalid tile coordinates", { status: 400 });
  }

  const url = `${OSM_TILE_URL}/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "StartupsMap.in (https://startupsmap.in)",
      },
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
    console.error("Tile proxy error:", error);
    reportServerError(error, { route: "api/tiles", layer: "proxy" });
    return new NextResponse("Failed to fetch tile", { status: 500 });
  }
}
