import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type BadgeTone } from "@/lib/badge-helpers";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  hiring: "border-action/40 bg-action/15 text-action",
  accent: "border-accent/40 bg-accent/15 text-accent",
  warn: "border-warn/40 bg-warn/15 text-warn",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

