/**
 * M5 CLS checker — measures cumulative layout shift on first paint.
 *
 * Standalone Playwright script (no new deps): loads `/` at a mobile
 * viewport, accumulates `layout-shift` entries (excluding those with a
 * recent input, per the CLS spec), prints the score and exits 0.
 *
 * Usage: node scripts/cls-check.mjs [url] [label]
 * Requires the dev server to already be running (webServer in the
 * Playwright config owns startup there; this script must not race it).
 */
import { chromium, devices } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3000/";
const label = process.argv[3] ?? "mobile";

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.addInitScript(() => {
  window.__cls = 0;
  window.__shifts = [];
  window.__fcpAt = null;
  window.__shellAt = null;
  let lastInput = 0;
  addEventListener("pointerdown", () => (lastInput = performance.now()), true);
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === "first-contentful-paint") window.__fcpAt = entry.startTime;
    }
  }).observe({ type: "paint", buffered: true });
  // Flash probe: when does the mobile-only shell (the Filters pill, which
  // exists only in the mobile toolbar) first appear in the DOM relative to
  // FCP? Pre-M5 that delta IS the desktop-shell flash window.
  // NOTE: observe `document`, not documentElement — at document-start the
  // <html> node does not exist yet and observe(null) would throw, killing
  // every observer registered after this one (the CLS score would then be a
  // dead-observer zero, not a measurement).
  new MutationObserver(() => {
    if (window.__shellAt !== null) return;
    const pill =
      document.querySelector('[data-testid="toolbar-mobile"]') ??
      document.querySelector('[aria-label="Toggle filters"]');
    if (pill) window.__shellAt = performance.now();
  }).observe(document, { childList: true, subtree: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput || performance.now() - lastInput < 500) continue;
      window.__cls += entry.value;
      window.__shifts.push({
        value: Number(entry.value.toFixed(4)),
        at: Math.round(entry.startTime),
        sources: (entry.sources ?? []).map((s) => {
          const n = s.node;
          return n
            ? `${n.tagName?.toLowerCase?.() ?? "?"}${n.id ? "#" + n.id : ""}.${(n.className ?? "").toString().split(" ").slice(0, 2).join(".")}`
            : "?";
        }),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(url, { waitUntil: "networkidle" });
// Give lazy chunks (Leaflet) and the fonts a moment to settle.
await page.waitForTimeout(3000);

const result = await page.evaluate(() => ({
  cls: Number(window.__cls.toFixed(4)),
  shifts: window.__shifts,
  fcpAt: window.__fcpAt === null ? null : Math.round(window.__fcpAt),
  shellAt: window.__shellAt === null ? null : Math.round(window.__shellAt),
}));
const flash =
  result.fcpAt !== null && result.shellAt !== null ? result.shellAt - result.fcpAt : null;
console.log(`[CLS:${label}] score=${result.cls} fcp=${result.fcpAt}ms shellAt=${result.shellAt}ms flashWindow=${flash}ms`);
for (const s of result.shifts.slice(0, 10)) {
  console.log(`  +${s.value} @${s.at}ms <- ${s.sources.join(" | ") || "?"}`);
}

await browser.close();
process.exit(result.cls > 0.1 ? 1 : 0);
