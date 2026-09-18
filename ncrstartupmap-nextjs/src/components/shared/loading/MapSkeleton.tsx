export function MapSkeleton() {
  return (
    <div className="grid-backdrop flex h-full w-full items-center justify-center bg-surface">
      <p className="animate-pulse text-sm text-muted-foreground">Loading map…</p>
    </div>
  );
}
