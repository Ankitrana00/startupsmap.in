/** Core Startup type — mirrors the backend `startups` shape. */
export type StartupStage = "Idea" | "Seed" | "Series A" | "Series B" | "Growth";

export interface Startup {
  id: string;
  name: string;
  /** Nullable: real rows (e.g. the unmapped queue) can have no description. */
  description: string | null;
  sector: string | null;
  /** Nullable: the unmapped_startups table has no stage column. */
  stage: StartupStage | null;
  area: string | null;
  /** Nullable: the unmapped queue stores founded as text and may omit it. */
  founded: number | null;
  is_hiring: boolean | null;
  /** null lat/lng means the startup could not be geocoded → Unmapped view. */
  lat: number | null;
  lng: number | null;
  website: string | null;
  linkedin: string | null;
  /** Nullable in the DB (migration 20240904) and missing from the unmapped queue. */
  address?: string | null;
}

export type ViewMode = "unmapped" | "map" | "grid";

export interface Filters {
  area: string | null;
  sector: string | null;
  stage: StartupStage | null;
}

export interface Counts {
  total: number;
  hiring: number;
  notHiring: number;
  unconfirmed: number;
  mapped: number;
  unmapped: number;
}
