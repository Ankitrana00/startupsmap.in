import type { Metadata } from "next";
import Link from "next/link";
import { PromoteForm } from "@/components/promote/PromoteForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Promote Your Startup",
  description:
    "Get your Delhi NCR startup featured on StartupsMap.in — homepage placement and promotion to thousands of founders, investors and partners.",
  alternates: { canonical: "/promote" },
  openGraph: {
    title: "Promote Your Startup — StartupsMap.in",
    description:
      "Get your startup featured on StartupsMap.in and reach thousands of founders, investors and partners.",
    url: "/promote",
  },
};

export default function PromotePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Promote Your Startup",
          url: `${SITE_URL}/promote`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
        }}
      />
      <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Promote Your Startup</h1>
      <p className="text-muted-foreground mb-6">
        Get your startup featured on StartupsMap.in and reach thousands of founders, investors, and partners.
      </p>
      <div className="panel p-6 rounded-xl">
        <PromoteForm />
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
      {/* Cross-links: promote → submit captures adjacent intent */}
      <nav
        aria-label="Related pages"
        className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
      >
        <Link
          href="/submit"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Submit a startup
        </Link>
      </nav>
      </main>
    </>
  );
}
