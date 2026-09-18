import type { Counts } from "@/lib/types/startup";

export function MapLegend({ counts }: { counts: Counts }) {
  const items = [
    { label: "Hiring", value: counts.hiring, className: "bg-action" },
    { label: "Not hiring", value: counts.notHiring, className: "bg-surface-raised" },
    { label: "Unconfirmed", value: counts.unconfirmed, className: "bg-accent" },
  ];

  return (
    <div className="panel pointer-events-auto absolute bottom-3 left-3 z-500 rounded-lg px-2 py-1 md:bottom-4 md:left-4 md:rounded-xl md:px-3 md:py-2.5">
      <p className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:mb-2 md:text-[0.65rem] md:tracking-[0.12em]">
        Hiring status
      </p>
      <ul className="space-y-0.5 md:space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-[0.7rem] text-foreground md:gap-2 md:text-xs">
            <span
              className={`size-2 shrink-0 rounded-full border-2 border-foreground/80 md:size-3 ${item.className}`}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap md:min-w-24">{item.label}</span>
            <span className="font-semibold tabular-nums text-muted-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
