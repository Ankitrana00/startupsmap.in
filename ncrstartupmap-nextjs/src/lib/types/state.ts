import type { ViewMode } from "./startup";

export interface DashboardState {
  view: ViewMode;
  search: string;
  filters: {
    area: string | null;
    sector: string | null;
    stage: string | null;
  };
}

export interface FilterState {
  area: string | null;
  sector: string | null;
  stage: string | null;
}
