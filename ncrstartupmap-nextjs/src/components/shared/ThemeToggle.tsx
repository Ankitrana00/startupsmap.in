"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyTheme,
  getServerThemeMode,
  getThemeMode,
  setThemeMode,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/theme/theme";

/** light → dark → system (and back), so all three states stay reachable. */
const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const MODE_LABEL: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const MODE_ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

/**
 * M4a theme control.
 *
 * Reads the persisted mode through an external store, so it stays consistent
 * with the inline no-FOUC script without a setState-in-effect hydration dance.
 * While the mode is `system`, it follows live OS changes.
 */
export function ThemeToggle({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const mode = useSyncExternalStore(subscribeTheme, getThemeMode, getServerThemeMode);

  useEffect(() => {
    if (mode !== "system") return;
    // Guard: jsdom / older engines may not implement matchMedia.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  const Icon = MODE_ICON[mode];
  const next = NEXT_MODE[mode];
  const label = `Theme: ${MODE_LABEL[mode]}. Switch to ${MODE_LABEL[next]}.`;

  return (
    <button
      type="button"
      onClick={() => setThemeMode(next)}
      aria-label={label}
      title={label}
      data-theme-toggle
      data-theme-mode={mode}
      className={cn(
        "flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        iconOnly ? "h-10 w-10" : "h-9 px-3",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {!iconOnly && <span>{MODE_LABEL[mode]}</span>}
    </button>
  );
}
