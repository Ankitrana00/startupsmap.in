"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/error/report-client-error";

/**
 * Root crash fallback (Next.js convention): catches errors in the root
 * layout itself, where the dashboard's in-tree ErrorBoundary cannot reach.
 * Self-contained — own <html>/<body>, no imports from the crashed tree.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, {
      digest: error.digest,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      scope: "global-error",
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-440 px-4 py-4">
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              Something went wrong while loading the page.
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              You can try again — if it keeps failing, refresh the page.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
