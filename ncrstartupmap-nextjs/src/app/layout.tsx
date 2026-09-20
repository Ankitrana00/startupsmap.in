import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Providers from "./providers";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

// Analytics are env-gated: both components internally no-op when their
// NEXT_PUBLIC_* vars are unset, so mounting them is always safe (U1).
const GoogleAnalytics = dynamic(
  () => import("@/components/analytics/GoogleAnalytics").then((m) => m.GoogleAnalytics),
);
const PlausibleAnalytics = dynamic(
  () => import("@/components/analytics/PlausibleAnalytics").then((m) => m.PlausibleAnalytics),
);

const inter = Inter({ subsets: ["latin"], display: "swap" });

const DEFAULT_DESCRIPTION =
  "Explore startups across Delhi NCR on an interactive map: filter by area, sector, stage and hiring status.";

// Site-wide Organization + WebSite schema — every page inherits this.
const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "StartupsMap.in — Discover Startups Across Delhi NCR",
    template: "%s — StartupsMap.in",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  icons: [
    { url: "/icon.svg", type: "image/svg+xml" },
    { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
  ],
  // Search Console ownership: paste the code Google gives you into
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION (e.g. in Vercel env vars),
  // redeploy, then click "Verify" in Search Console. Empty = tag omitted.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "StartupsMap.in — Discover Startups Across Delhi NCR",
    description:
      "An interactive map and directory of startups across Delhi NCR, with hiring signals and filters.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "StartupsMap.in — Discover Startups Across Delhi NCR",
    description:
      "An interactive map and directory of startups across Delhi NCR, with hiring signals and filters.",
  },
};

// Extended under the display cutouts so the mobile shell's
// env(safe-area-inset-*) offsets (toolbar / tray / count badge) resolve to
// real values instead of 0. Mobile-only effect: the offsets are all
// `max-md:`-scoped or live inside the mobile branch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return (
    <html lang="en" className={inter.className}>
      {baseUrl && <link rel="preconnect" href={baseUrl} />}
      <body>
        <JsonLd data={SITE_SCHEMA} />
        <Providers>
          <GoogleAnalytics />
          <PlausibleAnalytics />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
