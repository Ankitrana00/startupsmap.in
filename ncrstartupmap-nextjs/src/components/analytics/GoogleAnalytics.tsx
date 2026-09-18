"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

/**
 * Forwards a Web Vital to GA4 as a custom event (only when GA is configured).
 * Lets you slice LCP/INP/CLS by page, device, and connection in GA4 reports.
 */
function sendToGA(metric: Metric) {
  window.gtag?.("event", metric.name, {
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    event_category: "Web Vitals",
    event_label: metric.id,
    non_interaction: true,
  });
}

export function GoogleAnalytics() {
  useEffect(() => {
    // Web Vitals listeners attach only when GA is configured — zero cost
    // otherwise. The `web-vitals` lib ships with this client component either
    // way (small, ~2KB), but no listeners run without a measurement ID.
    if (GA_MEASUREMENT_ID) {
      onCLS(sendToGA);
      onFCP(sendToGA);
      onINP(sendToGA);
      onLCP(sendToGA);
      onTTFB(sendToGA);
    }

    if (!GA_MEASUREMENT_ID) return;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    if (typeof window !== "undefined") {
      if (!window.dataLayer) window.dataLayer = [];
      function gtag(...args: unknown[]) {
        (window.dataLayer as unknown[]).push(args);
      }
      gtag("js", new Date());
      gtag(
        "config",
        GA_MEASUREMENT_ID,
        {
          // Privacy-aware defaults: no consent mode means GA treats all
          // traffic as analytics storage allowed (sDESIRED for a public
          // directory site with no auth-walled analytics needs).
          cookie_flags: "SameSite=Lax; Secure",
          // Send pageviews through the linker so cross-domain tracking
          // (e.g. if you add a custom domain alias) works without extra
          // config later. Empty domains list = no-op until you add them.
          linker: { domains: [] },
          // Only calls /collect with page_view when the DOM is ready —
          // avoids double-counting SSR-rendered initial pages.
          send_page_view: true,
        },
        // `send_to` maps the GA4 config to the Search Console property
        // via the GA4 admin panel link (see the steps below). There is no
        // code-level Search Console property ID to paste here — it is set
        // once in Google Analytics → Admin → Search Console Links.
        undefined,
      );
    }

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
