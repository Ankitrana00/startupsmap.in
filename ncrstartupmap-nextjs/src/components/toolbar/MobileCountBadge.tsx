"use client";

/**
 * Floating startup count indicator for mobile.
 *
 * Pinned to the map layer's top-right on mobile (`max-md:`), which is the only
 * corner left free: the legend owns bottom-left, the ads panel bottom-right and
 * Leaflet's zoom control the top-left. Base `left-3 bottom-*` is the desktop
 * fallback (this component is only rendered in the mobile branch today).
 * `max-md:bottom-auto` is required — a fixed box with both `top` and `bottom`
 * set stretches to fill the viewport.
 * `pointer-events-none`: the badge is informational and must not swallow
 * map-drag gestures inside its rect.
 * Fixed, above the map (z-[550]) but below the toolbar (z-[600]) and tray
 * (z-[610]). Safe-area aware so it never sits under the cutout.
 */
export function MobileCountBadge({ total }: { total: number }) {
  return (
    <p
      role="status"
      data-testid="count-badge-mobile"
      className="pointer-events-none fixed left-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-550 rounded-full panel px-3 py-1.5 font-display text-sm font-semibold tabular-nums text-foreground max-md:left-auto max-md:right-3 max-md:bottom-auto max-md:top-[calc(env(safe-area-inset-top)+var(--mobile-toolbar-top)+var(--mobile-toolbar-min-h)+12px)]"
    >
      {total} {total === 1 ? "startup" : "startups"}
    </p>
  );
}
