/**
 * Theme mode contract (M4a).
 *
 * The CSS token set lives in `src/styles/globals.css` under
 * `:root[data-theme="dark"]`, and the Tailwind `dark:` variant is aligned to the
 * same attribute. This module is the single JS source of truth for:
 *
 *   1. the persisted choice (localStorage),
 *   2. resolving `system` against `prefers-color-scheme`,
 *   3. writing `data-theme` + the `theme-color` meta tag,
 *   4. the inline no-FOUC script that runs before first paint.
 *
 * Deliberately dependency-free so it can be inlined into the `<head>`-equivalent
 * position without pulling a client bundle in front of paint.
 */

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ncr-startup-map-theme:v1";

/**
 * Kept in sync with `--background` in globals.css so the browser chrome matches
 * the page. `light` = `:root` --background, `dark` = `:root[data-theme="dark"]`.
 */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f3f4f3",
  dark: "#1a1b1a",
};

export const DEFAULT_THEME_MODE: ThemeMode = "system";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/** Resolve a mode to the concrete theme. `system` needs a browser to be meaningful. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window === "undefined") return "light";
  // Guard: not every environment implements matchMedia (jsdom, older engines).
  if (typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
  } catch {
    // Private mode / disabled storage — fall back to system, never throw.
    return DEFAULT_THEME_MODE;
  }
}

export function writeStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Best-effort: a failed write only means the choice is not remembered.
  }
}

/** Apply the resolved theme to the document + sync the browser-chrome color. */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[resolved]);
}

/* ------------------------------------------------------------------ *
 * Small external store so the toggle can use `useSyncExternalStore`
 * instead of setState-inside-effect (which the lint config rejects).
 * ------------------------------------------------------------------ */

let currentMode: ThemeMode = DEFAULT_THEME_MODE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

export function getServerThemeMode(): ThemeMode {
  // Server + first client paint must agree; the inline script owns the real
  // value until hydration, after which the first subscription syncs it.
  return DEFAULT_THEME_MODE;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    const stored = readStoredTheme();
    if (stored !== currentMode) {
      currentMode = stored;
      // Defer so we never emit synchronously inside subscribe().
      queueMicrotask(emit);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Set + persist + apply + notify. Safe to call from event handlers. */
export function setThemeMode(mode: ThemeMode): void {
  currentMode = mode;
  writeStoredTheme(mode);
  applyTheme(mode);
  emit();
}

/**
 * Inline script injected before first paint. Reads storage, resolves `system`
 * against the OS preference, and stamps `data-theme` — so the correct token set
 * is active before anything renders (no light flash on a dark-preferring user).
 * Wrapped in try/catch: a storage failure must never block rendering.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var m=(s==="light"||s==="dark"||s==="system")?s:"system";var d=m==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;var e=document.documentElement;e.setAttribute("data-theme",d);var t=document.querySelector('meta[name="theme-color"]');if(t){t.setAttribute("content",d==="dark"?${JSON.stringify(
  THEME_COLORS.dark,
)}:${JSON.stringify(THEME_COLORS.light)})}}catch(e){}})();`;
