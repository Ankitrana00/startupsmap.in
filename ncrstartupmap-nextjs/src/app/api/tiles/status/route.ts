import { NextResponse } from "next/server";
import { getActiveProvider, TILE_MAX_ZOOM } from "@/lib/tiles/providers";

// The active provider is in-memory breaker state (quota/network failover), so
// this response must never be cached by the CDN or the browser.
export const dynamic = "force-dynamic";

/**
 * Tells the Leaflet client which provider is currently ACTIVE and how deep its
 * native tile coverage goes (maxNativeZoom). The client applies this to its
 * single L.tileLayer so deep zooms over-zoom real tiles instead of showing
 * blank/white tiles. Queried by the client on init and re-queried on tile
 * errors (throttled) so a server-side fallback propagates to the whole map.
 */
export async function GET() {
  const active = getActiveProvider();
  return NextResponse.json(
    {
      provider: active.name,
      maxNativeZoom: active.maxNativeZoom,
      maxZoom: TILE_MAX_ZOOM,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}