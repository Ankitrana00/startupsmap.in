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
      maxBounds: NCR_BOUNDS,
      zoomControl: true,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
    });

    const tileLayer = L.tileLayer("/api/tiles/{z}/{x}/{y}", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
      updateWhenIdle: true,
      keepBuffer: 2,
      minZoom: 3,
      detectRetina: false,
      crossOrigin: true,
    });

    // Remove loading="lazy" from tiles so they load immediately (improves LCP).
    tileLayer.on("tileload", (e: L.TileEvent) => {
      const img = e.tile as HTMLImageElement;
      img.loading = "eager";
      img.setAttribute("fetchpriority", "high");
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
