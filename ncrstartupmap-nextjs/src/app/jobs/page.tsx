import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Find Startup Jobs in Delhi NCR",
  description:
    "Browse job openings at startups across Delhi NCR — filter by role, location and work type, and apply directly.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    title: "Startup Jobs in Delhi NCR — StartupsMap.in",
    description:
      "Browse job openings at startups across Delhi NCR — filter by role, location and work type.",
    url: "/jobs",
  },
};

export default function JobsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Find Startup Jobs in Delhi NCR",
          url: `${SITE_URL}/jobs`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
        }}
      />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Jobs</h1>
        <p className="text-muted-foreground">Jobs section coming soon.</p>
        {/* Cross-links: keeps /jobs connected to the site graph so ranking
            flows both ways once listings go live. */}
        <nav aria-label="Related pages" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="font-semibold text-foreground hover:underline">
            ← Explore startups on the map
          </Link>
          <Link href="/submit" className="text-muted-foreground hover:text-foreground hover:underline">
            Hiring? Submit your startup
          </Link>
          <Link
            href="/promote"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Promote your opening
          </Link>
        </nav>
      </main>
    </>
  );
}
