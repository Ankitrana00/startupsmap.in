import { Grid2x2, MapPinOff, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/types/startup";

const options: { value: ViewMode; label: string; Icon: typeof MapIcon }[] = [
  { value: "unmapped", label: "Unmapped", Icon: MapPinOff },
  { value: "map", label: "Map", Icon: MapIcon },
  { value: "grid", label: "Grid", Icon: Grid2x2 },
];

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Choose view"
      className="flex rounded-lg border border-border bg-surface p-0.5"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={view === value}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            view === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
