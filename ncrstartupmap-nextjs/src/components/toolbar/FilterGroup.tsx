"use client";

import { cn } from "@/lib/utils";

interface FilterGroupProps<T = string> {
  label: string;
  value: T | null;
  options: readonly T[];
  onSelect: (value: T | null) => void;
}

/**
 * A single filter category (Area / Sector / Stage) rendered as a labelled
 * chip row. "All X" clears the filter; selecting a chip sets it. The active
 * chip uses the dark primary fill. Every chip is ≥40px tall for touch.
 */
export function FilterGroup({ label, value, options, onSelect }: FilterGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={value === null}
          className={cn(
            "h-9 min-w-10 rounded-lg border px-2.5 text-xs font-medium transition-colors",
            value === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          All {label.toLowerCase()}s
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={value === option}
            className={cn(
              "h-9 min-w-10 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
