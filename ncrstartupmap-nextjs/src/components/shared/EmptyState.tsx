import { SearchX } from "lucide-react";

/**
 * Shared empty/no-results panel.
 *
 * `announce` opts the panel into being a live region. It is deliberately
 * opt-in (default off) so it is never rendered *alongside* the count pill /
 * mobile badge — the app intentionally keeps exactly one `role="status"`
 * region at a time (see L2 in TODO_AUDIT_FIXES.md).
 */
export function EmptyState({
  message,
  announce = false,
}: {
  message: string;
  /** Render as `role="status"` — only where no other live region is present. */
  announce?: boolean;
}) {
  return (
    <div
      role={announce ? "status" : undefined}
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface-raised">
        <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
