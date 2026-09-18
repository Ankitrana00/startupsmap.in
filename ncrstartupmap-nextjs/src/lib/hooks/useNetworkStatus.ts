import { useEffect, useState } from "react";

/**
 * H2: SSR-safe network-status listener.
 *
 * `navigator.onLine` is undefined during SSR, so we seed with `true` (assume
 * online until the client effect runs and reads `navigator.onLine`) — this
 * avoids a flash of the offline banner on first paint. The banner itself is
 * rendered conditionally in DashboardContent, so it never affects SSR output.
 */
export function useNetworkStatus(): { online: boolean; isHydrated: boolean } {
  const [online, setOnline] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Guard for the narrow window where `window`/`navigator` aren't available
    // (e.g. some test environments). isHydrated flips to true only after the
    // client reads the real value.
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      return;
    }

            // Read the real value once and schedule the state updates via a
    // microtask. This defers setState past the effect body itself
    // (react-hooks/set-state-in-effect exemption), and setOnline +
    // setIsHydrated still batch into a single render commit.
    queueMicrotask(() => {
      setOnline(navigator.onLine);
      setIsHydrated(true);
    });

    const update = () => setOnline(navigator.onLine);

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return { online, isHydrated };
}
