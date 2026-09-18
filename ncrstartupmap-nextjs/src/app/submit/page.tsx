import type { Metadata } from "next";
import Link from "next/link";
import { SubmitForm } from "@/components/submit/SubmitForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Submit a Startup",
  description:
    "Submit your Delhi NCR startup to StartupsMap.in — get listed on the interactive map and reach founders, investors and talent.",
  alternates: { canonical: "/submit" },
  openGraph: {
    title: "Submit a Startup — StartupsMap.in",
    description:
      "Get your Delhi NCR startup listed on the interactive map and reach founders, investors and talent.",
    url: "/submit",
  },
};

export default function SubmitPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Submit a Startup",
          url: `${SITE_URL}/submit`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
        }}
      />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Submit a Startup</h1>
        <SubmitForm />
        {/* Cross-links: submit → jobs/promote keeps new founders in the loop. */}
        <nav aria-label="Related pages" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href="/promote"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Promote your startup
          </Link>
        </nav>
      </main>
    </>
  );
}
