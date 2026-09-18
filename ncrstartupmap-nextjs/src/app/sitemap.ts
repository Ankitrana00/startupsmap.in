import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemap — the 4 product features, each already a real URL:
 *   /         → startups on map (main dashboard)
 *   /jobs     → jobs board
 *   /submit   → submit a startup
 *   /promote  → promote a startup
 *
 * Dynamic /jobs/[id] entries are skipped for now — the detail page
 * is a "coming soon" stub with no per-job data source yet. When it
 * goes live backed by Supabase, query job IDs here and append them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/promote`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
