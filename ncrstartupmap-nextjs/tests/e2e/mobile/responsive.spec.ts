import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

/**
 * Mobile responsive geometry regression spec.
 *
 * Every bug this covers (unscrollable list views, the dead band under the map,
 * badge/legend collisions, 20px filter selects, a clipped toolbar) is invisible
 * to jsdom — the unit tests assert DOM/ARIA only, never layout. These
 * assertions read real rects from a real engine.
 *
 * Selector policy: role/text/aria-label based, matching the existing specs.
 * `data-testid="map-panel"` on MapPanel's root is the single markup addition
 * (the dynamic() loading shell has no stable identity of its own).
 *
 * Viewports are set per-describe with `test.use` — no new Playwright project.
 */

const MOBILE = { width: 375, height: 812 };
const NARROW = { width: 320, height: 568 };
const DESKTOP = { width: 1280, height: 800 };

/** First paint is slow under parallel workers (leaflet is lazy-loaded). */
const PAINT = 20000;
const CLICK_SETTLE = 20000;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True when two axis-aligned rects share at least 1px² of area. */
function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

/** Overflow metrics + viewport rect of the nearest fixed ancestor of `el`. */
function layerMetrics(el: Locator) {
  return el.evaluate((node) => {
    let host: HTMLElement | null = node as HTMLElement;
    while (host && getComputedStyle(host).position !== "fixed") host = host.parentElement;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    return {
      scrollHeight: host.scrollHeight,
      clientHeight: host.clientHeight,
      top: rect.top,
      bottom: rect.bottom,
      overflowY: getComputedStyle(host).overflowY,
    };
  });
}

/** Metrics of the fixed layer, asserting it exists. */
async function layerOf(el: Locator) {
  const metrics = await layerMetrics(el);
  expect(metrics, "element should live inside a fixed layer").not.toBeNull();
  return metrics as NonNullable<typeof metrics>;
}

/** Sets scrollTop on the nearest fixed ancestor of `el` and reports it back. */
function scrollFixedLayer(el: Locator, to: number) {
  return el.evaluate((node, top) => {
    let host: HTMLElement | null = node as HTMLElement;
    while (host && getComputedStyle(host).position !== "fixed") host = host.parentElement;
    if (!host) return -1;
    host.scrollTop = top;
    return host.scrollTop;
  }, to);
}

/** The fixed mobile toolbar (walks up from the Filters pill). */
function toolbarOf(page: Page): Locator {
  return page.getByLabel("Toggle filters").locator("xpath=../..");
}

/** The tray dialog. */
function trayOf(page: Page): Locator {
  return page.locator('[role="dialog"][aria-label="Filters"]');
}

/** The map legend (label text lives directly inside its panel root). */
function legendOf(page: Page): Locator {
  return page.getByText("Hiring status").locator("xpath=..");
}

/** The ads overlay panel (dismiss button → inner panel → positioned wrapper). */
function adsOf(page: Page): Locator {
  return page.getByLabel("Dismiss advertisements").locator("xpath=../..");
}

/**
 * The mobile count badge. M5 dual shell: it exists in the DOM at every
 * breakpoint (display:none ≥768px), so tests must assert *visibility*,
 * never existence.
 */
const badgeOf = (page: Page): Locator => page.getByTestId("count-badge-mobile");

/** Opens the tray and waits for it to paint. */
async function openTray(page: Page): Promise<void> {
  await page.getByLabel("Toggle filters").click();
  await expect(trayOf(page)).toBeVisible({ timeout: CLICK_SETTLE });
}

/** Switches view via the toolbar's segmented control (mobile). */
async function setView(page: Page, label: "Map" | "Grid" | "Unmapped"): Promise<void> {
  await page.getByRole("group", { name: "Choose view" }).getByRole("button", { name: label, exact: true }).click();
}

/** A rect from a locator, failing loudly instead of returning null. */
async function rectOf(locator: Locator, what: string): Promise<Rect> {
  const box = await locator.boundingBox();
  expect(box, `${what} should have a layout box`).not.toBeNull();
  return box as Rect;
}

test.describe("Mobile responsive shell @375x812", () => {
  test.use({ viewport: MOBILE });

  test("renders the mobile shell and not the desktop one", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    // Search moved out of the toolbar into the tray on mobile; it is only
    // visible after opening the Filters tray. (M5 dual shell: the desktop
    // search input now exists in the DOM at every width — CSS-hidden — so
    // visibility, not presence, is the assertion.)
    await expect(page.locator("#mobile-search-input")).toBeHidden();
    await expect(page.getByRole("group", { name: "Choose view" })).toBeVisible();
    await expect(page.locator("#search-input")).toBeHidden();
    // The desktop shell has no count badge at all.
    await expect(badgeOf(page)).toBeVisible({ timeout: PAINT });
  });

  test("toolbar is not clipped", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    const metrics = await toolbarOf(page).evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  });

  test("map clears the toolbar and fills its layer", async ({ page }) => {
    await page.goto("/");
    const mapPanel = page.locator('[data-testid="map-panel"]');
    await expect(mapPanel).toBeVisible({ timeout: PAINT });

    const toolbar = await rectOf(toolbarOf(page), "toolbar");
    const map = await rectOf(mapPanel, "map panel");
    const layer = await layerOf(mapPanel);

    // The map layer starts below the toolbar — never underneath it.
    expect(map.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height + 12);

    // The map fills its layer (no dead band under it) ...
    expect(Math.abs(map.y + map.height - layer.bottom)).toBeLessThanOrEqual(2);
    // ... and that layer ends at the viewport bottom, not past it.
    expect(layer.bottom).toBeLessThanOrEqual(MOBILE.height + 1);
    expect(map.y + map.height).toBeLessThanOrEqual(MOBILE.height + 1);
  });

  test("count badge clears the legend and the ads panel", async ({ page }) => {
    await page.goto("/");
    const badge = badgeOf(page);
    await expect(badge).toBeVisible({ timeout: PAINT });
    await expect(page.getByText("Hiring status")).toBeVisible({ timeout: PAINT });
    await expect(page.getByLabel("Dismiss advertisements")).toBeVisible({ timeout: PAINT });

    const badgeRect = await rectOf(badge, "count badge");
    const legendRect = await rectOf(legendOf(page), "legend");
    const adsRect = await rectOf(adsOf(page), "ads panel");

    expect(intersects(badgeRect, legendRect)).toBe(false);
    expect(intersects(badgeRect, adsRect)).toBe(false);

    // Fully inside the viewport, and inert so it never blocks map drags.
    expect(badgeRect.y).toBeGreaterThanOrEqual(0);
    expect(badgeRect.y + badgeRect.height).toBeLessThanOrEqual(MOBILE.height);
    await expect(badge).toHaveCSS("pointer-events", "none");
  });
  test("map view layer does not scroll", async ({ page }) => {
    await page.goto("/");
    const mapPanel = page.locator('[data-testid="map-panel"]');
    await expect(mapPanel).toBeVisible({ timeout: PAINT });
    const layer = await layerOf(mapPanel);
    expect(layer.scrollHeight).toBeLessThanOrEqual(layer.clientHeight + 1);
    expect(layer.overflowY).toBe("hidden");
  });

  test("tray filter controls are 40px tall and evenly sized", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    await openTray(page);

    const tray = trayOf(page);
    const selects = tray.locator("select");
    await expect(selects).toHaveCount(3);

    const boxes: Rect[] = [];
    for (let i = 0; i < 3; i += 1) {
      boxes.push(await rectOf(selects.nth(i), `tray select ${i}`));
    }
    for (const box of boxes) {
      expect(box.height).toBe(40);
    }
    expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes[1].width - boxes[2].width)).toBeLessThanOrEqual(1);

    // Controls stay inside the tray (no horizontal overflow).
    const trayRect = await rectOf(tray, "tray");
    for (const box of boxes) {
      expect(box.x + box.width).toBeLessThanOrEqual(trayRect.x + trayRect.width + 1);
    }
  });

  test("tray opens and closes via toggle, Escape and outside click", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByLabel("Toggle filters");
    await expect(toggle).toBeVisible({ timeout: PAINT });

    // The toggle opens it.
    await openTray(page);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // The toggle closes it too — regression guard for the pill-close bug
    // (MOBILE_TOOLBAR_TODO Problem #8).
    await toggle.click();
    await expect(trayOf(page)).toBeHidden({ timeout: CLICK_SETTLE });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Escape closes it.
    await openTray(page);
    await page.keyboard.press("Escape");
    await expect(trayOf(page)).toBeHidden({ timeout: CLICK_SETTLE });

    // A tap outside closes it (bottom-left, clear of the tray and the pill).
    await openTray(page);
    await page.mouse.click(20, MOBILE.height - 40);
    await expect(trayOf(page)).toBeHidden({ timeout: CLICK_SETTLE });
  });


  test("grid view layer scrolls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    await setView(page, "Grid");

    const grid = page.locator('[data-testid="grid-container"]');
    await expect(grid).toBeVisible({ timeout: PAINT });

    const layer = await layerOf(grid);
    // The bug that shipped: thousands of px of cards inside a box that could
    // not move.
    expect(layer.scrollHeight).toBeGreaterThan(layer.clientHeight);
    expect(layer.overflowY).toBe("auto");

    const scrolled = await scrollFixedLayer(grid, 500);
    expect(scrolled).toBeGreaterThan(0);
  });

  test("grid view has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    await setView(page, "Grid");
    await expect(page.locator('[data-testid="grid-container"]')).toBeVisible({ timeout: PAINT });

    const widths = await page.evaluate(() => ({
      doc: document.scrollingElement?.scrollWidth ?? 0,
      viewport: window.innerWidth,
    }));
    expect(widths.doc).toBeLessThanOrEqual(widths.viewport);
  });

  test("unmapped view layer scrolls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    await setView(page, "Unmapped");

    const intro = page.getByText("These startups have an address on file");
    await expect(intro).toBeVisible({ timeout: PAINT });

    const layer = await layerOf(intro);
    expect(layer.scrollHeight).toBeGreaterThan(layer.clientHeight);
    expect(layer.overflowY).toBe("auto");
  });

});

test.describe("Mobile responsive shell @320x568 (smallest supported)", () => {
  test.use({ viewport: NARROW });

  test("shell fits without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    await expect(page.getByRole("group", { name: "Choose view" })).toBeVisible();
    // M5 dual shell: hidden-by-CSS, not absent — see the 375px twin above.
    await expect(page.locator("#mobile-search-input")).toBeHidden();
    await expect(page.locator("#search-input")).toBeHidden();

    const widths = await page.evaluate(() => ({
      doc: document.scrollingElement?.scrollWidth ?? 0,
      viewport: window.innerWidth,
    }));
    expect(widths.doc).toBeLessThanOrEqual(widths.viewport);
  });

  test("toolbar is not clipped and clear of the map", async ({ page }) => {
    await page.goto("/");
    const mapPanel = page.locator('[data-testid="map-panel"]');
    await expect(mapPanel).toBeVisible({ timeout: PAINT });

    const metrics = await toolbarOf(page).evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);

    const toolbar = await rectOf(toolbarOf(page), "toolbar");
    const map = await rectOf(mapPanel, "map panel");
    const layer = await layerOf(mapPanel);

    expect(map.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height + 12);
    expect(Math.abs(map.y + map.height - layer.bottom)).toBeLessThanOrEqual(2);
  });

  test("tray controls stay 40px tall", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
    await openTray(page);

    const selects = trayOf(page).locator("select");
    await expect(selects).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      const box = await rectOf(selects.nth(i), `tray select ${i}`);
      expect(box.height).toBe(40);
    }
  });

  test("badge stays clear of the legend", async ({ page }) => {
    await page.goto("/");
    const badge = badgeOf(page);
    await expect(badge).toBeVisible({ timeout: PAINT });
    await expect(page.getByText("Hiring status")).toBeVisible({ timeout: PAINT });

    const badgeRect = await rectOf(badge, "count badge");
    const legendRect = await rectOf(legendOf(page), "legend");
    expect(intersects(badgeRect, legendRect)).toBe(false);
    expect(badgeRect.x).toBeGreaterThanOrEqual(0);
    expect(badgeRect.x + badgeRect.width).toBeLessThanOrEqual(NARROW.width);
  });
});

test.describe("Desktop shell @1280x800 (no-regression guard)", () => {
  test.use({ viewport: DESKTOP });

  test("keeps the desktop toolbar and hides the mobile shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#search-input")).toBeVisible({ timeout: PAINT });

    // No *visible* mobile chrome on desktop: pill, tray, mobile search and
    // the count badge all exist in the DOM (M5 dual shell) but are
    // display:none ≥768px — assert visibility, not existence.
    await expect(page.getByLabel("Toggle filters")).toBeHidden();
    await expect(page.locator("#mobile-search-input")).toBeHidden();
    await expect(trayOf(page)).toHaveCount(0);
    await expect(badgeOf(page)).toBeHidden();

    // Exactly one toolbar — guards the duplicated-toolbar bug.
    await expect(page.locator('a:has-text("Submit a startup")')).toHaveCount(1);
  });

  test("filter dropdowns keep their desktop 36px height", async ({ page }) => {
    await page.goto("/");
    const area = page.locator("#filter-area");
    await expect(area).toBeVisible({ timeout: PAINT });
    await expect(page.locator("#filter-sector")).toBeVisible();
    await expect(page.locator("#filter-stage")).toBeVisible();

    const box = await rectOf(area, "desktop area select");
    expect(box.height).toBe(36);
  });

  test("map panel keeps its desktop height and placement", async ({ page }) => {
    await page.goto("/");
    const mapPanel = page.locator('[data-testid="map-panel"]');
    await expect(mapPanel).toBeVisible({ timeout: PAINT });

    // md:h-[calc(100vh-11rem)] — unchanged by the mobile work.
    const box = await rectOf(mapPanel, "map panel");
    expect(box.height).toBeCloseTo(DESKTOP.height - 176, 0);
  });

  test("page does not scroll vertically", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#search-input")).toBeVisible({ timeout: PAINT });
    const metrics = await page.evaluate(() => ({
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      clientHeight: document.scrollingElement?.clientHeight ?? 0,
    }));
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  });
});

// M5 permanent guard: the dual shell renders BOTH toolbars server-side and
// hands the branch to CSS. These tests pin the invariant at every configured
// breakpoint: exactly one toolbar visible, and exactly one instance of the
// (shared, responsive) view content — never two maps or two grids.
test.describe("M5 invariant: exactly one toolbar visible per breakpoint", () => {
  const viewRoot = (page: Page) =>
    page.locator(
      '[data-testid="map-panel"], [data-testid="grid-container"]',
    );

  test.describe("mobile @375x812", () => {
    test.use({ viewport: MOBILE });

    test("mobile toolbar visible, desktop hidden, one view instance", async ({ page }) => {
      await page.goto("/");
      // The mobile toolbar's root is position:fixed, so the wrapper div has
      // no in-flow box — assert via the pill (a real, visible descendant)
      // that the mobile toolbar painted, and via the wrapper that the
      // desktop one is display:none.
      await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
      await expect(page.getByTestId("toolbar-desktop")).toBeHidden();
      await expect(viewRoot(page)).toHaveCount(1);
    });
  });

  test.describe("narrow @320x568", () => {
    test.use({ viewport: NARROW });

    test("mobile toolbar visible, desktop hidden, one view instance", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByLabel("Toggle filters")).toBeVisible({ timeout: PAINT });
      await expect(page.getByTestId("toolbar-desktop")).toBeHidden();
      await expect(viewRoot(page)).toHaveCount(1);
    });
  });

  test.describe("desktop @1280x800", () => {
    test.use({ viewport: DESKTOP });

    test("desktop toolbar visible, mobile hidden, one view instance", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByTestId("toolbar-desktop")).toBeVisible({ timeout: PAINT });
      await expect(page.getByTestId("toolbar-mobile")).toBeHidden();
      await expect(viewRoot(page)).toHaveCount(1);
    });
  });
});
