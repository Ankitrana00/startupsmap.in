import { StartupCard } from "@/components/views/GridView/StartupCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useShowMore } from "@/lib/hooks/useShowMore";
import type { Startup } from "@/lib/types/startup";

export function UnmappedList({
  startups,
  resetKey,
}: {
  startups: Startup[];
  resetKey?: string;
}) {
  // Hooks must be called unconditionally in the same order on every render
  // (Rules of Hooks), so pagination state is computed before the EmptyState
  // early return even though it's only consumed by the non-empty branch. With
  // total = 0 the hook clamps visible to 0 and reports hasMore = false.
  const { visible, remaining, hasMore, showMore } = useShowMore(
    startups.length,
    24,
    resetKey ?? `${startups.length}`,
  );

  if (startups.length === 0) {
    return <EmptyState message="Every startup in this selection is on the map." />;
  }

  const shown = startups.slice(0, visible);

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">
        These startups have an address on file but no confirmed coordinates yet.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((startup) => (
          <li key={startup.id}>
            <StartupCard startup={startup} />
          </li>
        ))}
      </ul>
      {/* Button/footer live BELOW the <ul> — never grid cells. */}
      <div className="flex flex-col items-center gap-2 pt-2">
        {/* Plain text (not role=status): the toolbar count pill is already a
            live region — a second announce would be noisy (toolbar convention). */}
        {/* M7: 14px (was 12px) — muted-foreground at 12px was the weakest combo. */}
        <p className="text-sm tabular-nums text-muted-foreground">
          Showing {shown.length} of {startups.length} startups
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={showMore}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50"
          >
            Show more ({remaining} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

