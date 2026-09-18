import type { Metadata } from "next";
import Link from "next/link";

// C2: every unmatched URL previously fell through to Next's unstyled default
// 404 — a dead end with no brand and no way back. This branded fallback keeps
// users inside the site. Server component, no client JS: renders without
// hydration. The root metadata title template yields
// "Page not found — StartupsMap.in".
export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Page not found</h1>
      <p className="text-muted-foreground mb-8">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        &larr; Back to the map
      </Link>
    </main>
  );
}
