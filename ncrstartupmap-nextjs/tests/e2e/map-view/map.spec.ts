import { test, expect } from "@playwright/test";

test.describe("Map View", () => {
  test("renders the map", async ({ page }) => {
    await page.goto("/");
    // Leaflet is lazy-loaded via next/dynamic — Firefox needs extra
    // hydration time under parallel workers.
    await expect(
      page.locator('[aria-label="Map of NCR startups"]'),
    ).toBeVisible({ timeout: 20000 });
  });

  test("renders startup markers", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".startup-marker").first()).toBeVisible({
      timeout: 20000,
    });
  });

  test("filters by area", async ({ page }) => {
    await page.goto("/");
    const area = page.locator("#filter-area");
    // index 1 = first real area option (index 0 is "All areas")
    await area.selectOption({ index: 1 });
    await expect(area).not.toHaveValue("");
  });

  test("zooms in and out", async ({ page }) => {
    await page.goto("/");
    const zoomIn = page.locator('[aria-label="Zoom in"]');
    const zoomOut = page.locator('[aria-label="Zoom out"]');
    // Leaflet loads via next/dynamic — cold dev compiles under parallel
    // workers exceed the 5s default (same budget as "renders the map" above).
    await expect(zoomIn).toBeVisible({ timeout: 20000 });
    await expect(zoomOut).toBeVisible({ timeout: 20000 });
    await zoomIn.click();
    await zoomOut.click();
  });
});
