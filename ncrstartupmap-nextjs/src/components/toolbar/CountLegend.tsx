import type { Counts } from "@/lib/types/startup";

export function CountLegend({ counts }: { counts: Counts }) {
  const pills = [
    { label: "hiring", value: counts.hiring, dot: "bg-action" },
    { label: "not hiring", value: counts.notHiring, dot: "bg-surface-raised" },
    { label: "unconfirmed", value: counts.unconfirmed, dot: "bg-accent" },
    { label: "unmapped", value: counts.unmapped, dot: "bg-warn" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="font-display text-sm font-semibold text-foreground tabular-nums">
        {counts.total} startups
      </span>
      {pills.map((pill) => (
        <span key={pill.label} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${pill.dot}`} aria-hidden="true" />
          <span className="tabular-nums text-foreground">{pill.value}</span>
          {pill.label}
        </span>
      ))}
    </div>
  );
}
