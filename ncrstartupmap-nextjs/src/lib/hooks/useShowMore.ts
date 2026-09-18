import { useCallback, useState } from "react";

/**
 * "Show more" pagination math for large card lists.
 *
 * Callers render `items.slice(0, visible)` — the hook guarantees `visible`
 * never exceeds `total` (clamp), so a stale large visible plus a newly
 * filtered short list can never slice out of bounds.
 *
 * Reset: when `resetKey` changes (filters/search/dataset changed), visible
 * returns to `step`. Pass a stable signature (e.g. `${items.length}:${search}`),
 * NOT an array identity — StrictMode double-invokes and memo churn would
 * double-fire resets on array identity alone.
 *
 * The reset adjusts state during render (React's "You Might Not Need an
 * Effect" pattern) rather than calling setState inside an effect — React
 * re-runs this render immediately with the updated value, so callers never
 * observe a stale committed frame.
 */
export function useShowMore(total: number, step = 24, resetKey: string | number = "") {
  const [visible, setVisible] = useState(() => Math.min(step, total));

  // Reset to step whenever the caller's state signature changes. Both state
  // writes happen together so React re-runs this render with the reset value
  // (no cascading render from setState-in-effect).
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setVisible(Math.min(step, total));
  }

  // Clamp against the live total on every render (never slice OOB).
  const clamped = Math.min(visible, total);
  const remaining = Math.max(total - clamped, 0);

  const showMore = useCallback(() => {
    setVisible((v) => Math.min(v + step, total));
  }, [step, total]);

  return {
    visible: clamped,
    remaining,
    hasMore: remaining > 0,
    showMore,
  } as const;
}
