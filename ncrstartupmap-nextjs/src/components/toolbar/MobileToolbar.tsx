"use client";

import { useRef, useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoButton } from "@/components/toolbar/LogoButton";
import { FilterTray } from "@/components/toolbar/FilterTray";
import { ViewToggle } from "@/components/toolbar/ViewToggle";
import { useDashboardStore } from "@/lib/state/store";
import type { StartupStage } from "@/lib/types/startup";

interface MobileToolbarProps {
  areas: readonly string[];
  sectors: readonly string[];
  stages: readonly StartupStage[];
}

/**
 * Compact fixed overlay toolbar for mobile (< 768px).
 *
 * Row 1: brand (left, truncates) + Filters pill + Submit (+) button.
 * Row 2: view toggle (Map/Grid/Unmapped). Frosted glass via `.panel`. Safe-area aware.
 * Width is `calc(100% - 24px)` via `left-3 right-3`. Height ~100px.
 */
export function MobileToolbar({ areas, sectors, stages }: MobileToolbarProps) {
  const [trayOpen, setTrayOpen] = useState(false);
  // Ref of the Filters pill — handed to FilterTray so outside-click ignores
  // it and the pill's own click can close the tray (Problem #8).
  const toggleRef = useRef<HTMLButtonElement>(null);

  const view = useDashboardStore((s) => s.view);
  const setView = useDashboardStore((s) => s.setView);
  const search = useDashboardStore((s) => s.search);
  const filters = useDashboardStore((s) => s.filters);

  const hasActiveFilters =
    search !== "" || filters.area !== null || filters.sector !== null || filters.stage !== null;

  return (
    <>
      <div
        className="fixed left-3 right-3 z-[600] flex min-h-[var(--mobile-toolbar-min-h)] flex-col justify-center gap-2 overflow-hidden rounded-[18px] panel"
        style={{ top: "calc(env(safe-area-inset-top) + var(--mobile-toolbar-top))" }}
      >
        {/* Row 1: brand + actions */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <LogoButton compact />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setTrayOpen((open) => !open)}
            aria-expanded={trayOpen}
            aria-label="Toggle filters"
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
              trayOpen || hasActiveFilters
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Filters
          </button>
          <Link
            href="/submit"
            aria-label="Submit a startup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>

        {/* Row 2: view toggle (search lives in the FilterTray) */}
        <div className="px-3 pb-2">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <FilterTray
        isOpen={trayOpen}
        onClose={() => setTrayOpen(false)}
        areas={areas}
        sectors={sectors}
        stages={stages}
        toggleRef={toggleRef}
      />
    </>
  );
}
