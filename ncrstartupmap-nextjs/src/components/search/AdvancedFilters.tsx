import { Filters } from "@/lib/types/startup";

interface AdvancedFiltersProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string | null) => void;
  areas: string[];
  sectors: string[];
  stages: string[];
}

export function AdvancedFilters({
  filters,
  onFilterChange,
  areas,
  sectors,
  stages,
}: AdvancedFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card rounded-xl border border-border">
      <div>
        <label htmlFor="area-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Area</label>
        <select
          id="area-filter"
          value={filters.area || ""}
          onChange={(e) => onFilterChange("area", e.target.value || null)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="sector-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Sector</label>
        <select
          id="sector-filter"
          value={filters.sector || ""}
          onChange={(e) => onFilterChange("sector", e.target.value || null)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="stage-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
        <select
          id="stage-filter"
          value={filters.stage || ""}
          onChange={(e) => onFilterChange("stage", e.target.value || null)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
