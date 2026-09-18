import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  /** Render nothing until the client has read navigator.onLine at least once. */
  isHydrated: boolean;
}

/**
 * H2: persistent offline notice shown at the top of the dashboard.
 *
 * The parent decides visibility — it only mounts this component when the user
 * is offline *and* the client has performed its first `navigator.onLine` read
 * (isHydrated). This keeps SSR output clean and avoids a layout shift on first
 * paint (the dashboard never flashes an offline banner to an online user).
 */
export function OfflineBanner({ isHydrated }: OfflineBannerProps) {
  if (!isHydrated) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-2 bg-warning/10 text-warning-foreground"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="size-4 shrink-0" />
      <span className="text-xs font-medium">
                You&apos;re offline. The map may not update until you reconnect.
      </span>
    </div>
  );
}

