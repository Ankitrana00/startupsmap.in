import { MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoButton({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex items-center gap-2 rounded-lg",
        compact ? "min-w-0 flex-1 px-1 py-1.5" : "shrink-0 px-3 py-2",
        "transition-colors hover:bg-secondary/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label="startupsmap.in — Home"
    >
      <span className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#0b0b12] via-[#1e1b4b] to-[#065f46] text-[#f5d67b] shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_16px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/20 transition-all duration-200 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-t before:from-transparent before:via-white/10 before:to-white/25 group-hover:scale-[1.05] group-hover:shadow-[0_2px_12px_rgba(0,0,0,0.55),0_0_22px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]",
        compact ? "h-7 w-7 shrink-0" : "h-8 w-8",
      )}
      >
        <MapPin className="relative size-[18px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className={cn(
        "bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text font-display font-bold tracking-[-0.02em] text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)] transition-all duration-200 group-hover:from-[#1e1b4b] group-hover:via-[#065f46] group-hover:to-[#b8860b] group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.25)]",
        compact ? "min-w-0 shrink truncate text-[13px]" : "text-[15px]",
      )}
      >
        startupsmap.in
      </span>
    </Link>
  );
}
