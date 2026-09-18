import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt — allow the 4 public feature pages, block everything else:
 *   /admin/*  → dev-only panel (also redirect-guarded by middleware in prod)
 *   /api/*    → JSON endpoints, no SEO value
 *   /account/*, /verify/* → auth-walled / token-gated
 *   /jobs/post, /jobs/[id] (stub), /submit/success → noindex via metadata
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/jobs$", "/submit$", "/promote"],
      disallow: ["/admin/", "/api/", "/account/", "/verify/", "/jobs/post", "/submit/success"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
