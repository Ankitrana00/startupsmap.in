const STORAGE_KEY = "ncr-startup-map-state:v1";

interface PersistedState {
  view: string;
  search: string;
  filters: Record<string, string | null>;
}

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn("Failed to save state to localStorage");
  }
}
