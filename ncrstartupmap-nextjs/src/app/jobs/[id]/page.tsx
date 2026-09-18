import type { Metadata } from "next";

interface JobPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Job Details — StartupsMap.in",
  description: "View job details on StartupsMap.in.",
  // Stub page ("coming soon", no per-job data) — keep out of the index
  // until it is backed by real job data, then index it and add to sitemap.ts.
  robots: { index: false, follow: false },
};

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Job Details</h1>
      <p className="text-muted-foreground">Job ID: {id}</p>
      <p className="text-muted-foreground mt-4">Job detail page coming soon.</p>
    </main>
  );
}
