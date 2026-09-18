"use client";

import { useEffect } from "react";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "";
const PLAUSIBLE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL || "https://plausible.io/js/script.js";

export function PlausibleAnalytics() {
  useEffect(() => {
    if (!PLAUSIBLE_DOMAIN) return;

    const script = document.createElement("script");
    script.src = PLAUSIBLE_SCRIPT_URL;
    script.setAttribute("data-domain", PLAUSIBLE_DOMAIN);
    script.setAttribute("data-tag", "script-tag");
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
