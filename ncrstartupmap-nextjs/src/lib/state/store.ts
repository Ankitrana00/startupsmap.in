import { create } from "zustand";
import type { Filters, ViewMode } from "@/lib/types/startup";

interface DashboardState {
  view: ViewMode;
  search: string;
  filters: Filters;
  setView: (view: ViewMode) => void;
  setSearch: (search: string) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
}

const emptyFilters: Filters = { area: null, sector: null, stage: null };

export const useDashboardStore = create<DashboardState>((set) => ({
  view: "map",
  search: "",
  filters: emptyFilters,
  setView: (view) => set({ view }),
  setSearch: (search) => set({ search }),
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...emptyFilters }, search: "" }),
}));
