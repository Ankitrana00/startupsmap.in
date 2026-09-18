import type { ReactNode } from "react";

/**
 * Responsive toolbar.
 * Wraps into multiple rows whenever items don't fit — including lg+, where
 * brand + toggle + search + 3 selects + CTA exceed ~1280px (measured 163px
 * overflow at 1280 with nowrap). `lg:justify-between` keeps the CTA pushed
 * right on wide screens.
 */
export function ToolbarContainer({ children }: { children: ReactNode }) {
  return (
    <div className="panel mx-auto flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 lg:justify-between">
      {children}
    </div>
  );
}
