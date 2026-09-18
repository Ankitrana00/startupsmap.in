export function StartupCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="h-5 bg-muted rounded w-3/4 mb-3" />
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-2/3 mb-4" />
      <div className="flex gap-2">
        <div className="h-6 bg-muted rounded w-16" />
        <div className="h-6 bg-muted rounded w-16" />
        <div className="h-6 bg-muted rounded w-12" />
      </div>
      <div className="mt-4 pt-3 border-t border-border flex justify-between">
        <div className="h-4 bg-muted rounded w-20" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
