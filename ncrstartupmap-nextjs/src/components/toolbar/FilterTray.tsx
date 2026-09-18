"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/state/store";
import type { StartupStage } from "@/lib/types/startup";
import { FilterDropdown } from "@/components/toolbar/FilterDropdown";
import { SearchBox } from "@/components/toolbar/SearchBox";

interface FilterTrayProps {
  isOpen: boolean;
  onClose: () => void;
  areas: readonly string[];
  sectors: readonly string[];
  stages: readonly StartupStage[];
  /**
   * Ref of the toggle button that opens this tray. Outside-click must NOT
   * fire for it (MOBILE_TOOLBAR_TODO Problem #8): otherwise the pill's
   * mousedown closes the tray and its click immediately reopens it, so the
   * pill can never close the tray.
   */
  toggleRef?: RefObject<HTMLElement | null>;
}

/**
 * Floating filter overlay for mobile.
 *
 * Overlays the map (fixed, does not affect document flow), closes on
 * outside click / Escape / toggle, and returns focus to the toggle button.
 * Frosted glass via `.panel`. Accessible: role="dialog", keyboard-ready.
 */
export function FilterTray({ isOpen, onClose, areas, sectors, stages, toggleRef }: FilterTrayProps) {
  const filters = useDashboardStore((s) => s.filters);
  const search = useDashboardStore((s) => s.search);
  const setSearch = useDashboardStore((s) => s.setSearch);
  const setFilter = useDashboardStore((s) => s.setFilter);
  const resetFilters = useDashboardStore((s) => s.resetFilters);

  const trayRef = useRef<HTMLDivElement>(null);
  // Element to restore focus to when the tray closes (captured on open).
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      // Defer one frame so the dialog is painted before focus lands inside it.
      const id = requestAnimationFrame(() => trayRef.current?.focus());
      return () => cancelAnimationFrame(id);
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // L8 defense-in-depth: if the key originated in a search input that
        // still holds text, that input owns this Escape (it clears itself —
        // see SearchBox). Ignore here so one press never does both actions.
        const target = e.target;
        if (
          target instanceof HTMLInputElement &&
          target.type === "search" &&
          target.value !== ""
        ) {
          return;
        }
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTray = trayRef.current?.contains(target) ?? false;
      const insideToggle = toggleRef?.current?.contains(target) ?? false;
      // Outside-click closes only when the click is outside BOTH the tray and
      // its toggle button (Problem #8). The toggle button's own onClick already
      // flips open/close, so a click on it is ignored here — no setTimeout
      // "arming" debounce is needed, and the arm variant was a cross-browser
      // hang (the opening mousedown was lost on slow engines, leaving the tray
      // uncloseable by outside-click).
      if (!insideTray && !insideToggle) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen, onClose, toggleRef]);

  if (!isOpen) return null;

  const hasActiveFilters =
    search !== "" ||
    filters.area !== null ||
    filters.sector !== null ||
    filters.stage !== null;

  /** Project UI tones for tray selects: mirror the toggle/chip scheme —
   * surface + border at rest, solid primary when a filter is active.
   * tailwind-merge lets these override FilterDropdown's base classes. */
  const traySelectTone = (active: boolean) =>
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-surface text-foreground hover:border-primary/50";

  return (
    <div
      ref={trayRef}
      role="dialog"
      aria-label="Filters"
      aria-modal="false"
      tabIndex={-1}
      className="filter-tray-enter fixed left-3 right-3 z-[610] max-h-[60vh] overflow-y-auto overscroll-contain rounded-[18px] panel p-4 focus:outline-none max-md:max-h-[60dvh]"
      style={{
        top: "calc(env(safe-area-inset-top) + var(--mobile-toolbar-top) + var(--mobile-toolbar-min-h) + 12px)",
      }}
    >
      {/* Search moved out of the mobile toolbar so the view toggle can live
          there (always reachable); the tray still owns the filter + search input. */}
      <div className="px-1 pb-3">
        <SearchBox value={search} onChange={setSearch} id="mobile-search-input" className="w-full" />
      </div>

      {/* Filter selects + Reset — one row, same dropdown UI scheme as the
          desktop toolbar, restyled to the project tones: matches the toggle
          (h-10, rounded-lg, border-border/bg-surface) with the primary fill
          when a filter is active. Selects flex to share the width. */}
      <div className="mt-4 flex items-center gap-2">
        <FilterDropdown
          label="Area"
          id="filter-mobile-area"
          value={filters.area}
          options={areas}
          onSelect={(v) => setFilter("area", v)}
          className={cn("h-10 min-w-0", traySelectTone(filters.area !== null))}
          wrapperClassName="min-w-0 flex-1"
          placeholder="Area"
        />
        <FilterDropdown
          label="Sector"
          id="filter-mobile-sector"
          value={filters.sector}
          options={sectors}
          onSelect={(v) => setFilter("sector", v)}
          className={cn("h-10 min-w-0", traySelectTone(filters.sector !== null))}
          wrapperClassName="min-w-0 flex-1"
          placeholder="Sector"
        />
        <FilterDropdown
          label="Stage"
          id="filter-mobile-stage"
          value={filters.stage}
          options={stages}
          onSelect={(v) => setFilter("stage", v)}
          className={cn("h-10 min-w-0", traySelectTone(filters.stage !== null))}
          wrapperClassName="min-w-0 flex-1"
          placeholder="Stage"
        />
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          aria-label="Reset filters"
          title="Reset filters"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasActiveFilters
              ? "text-foreground hover:bg-muted"
              : "cursor-not-allowed text-muted-foreground opacity-50",
          )}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
