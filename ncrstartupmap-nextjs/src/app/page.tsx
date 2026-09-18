import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardContent } from "./DashboardContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";

export default function Dashboard() {
  // Suspense boundary is required: DashboardContent reads searchParams
  // (URL-synced filters, Phase U2) and the page must still prerender.
  return (
    <>
      <span className="sr-only">
        <h1>Discover Startups Across Delhi NCR</h1>
      </span>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Discover Startups Across Delhi NCR",
          url: `${SITE_URL}/`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
        }}
      />
      <Suspense fallback={null}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

export const metadata: Metadata = {
  title: "Discover Startups Across Delhi NCR",
  description:
    "Explore startups across Delhi NCR on an interactive map: filter by area, sector, stage and hiring status.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "StartupsMap.in — Discover Startups Across Delhi NCR",
    description:
      "An interactive map and directory of startups across Delhi NCR, with hiring signals and filters.",
    url: "/",
  },
};
