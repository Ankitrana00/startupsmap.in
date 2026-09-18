import { test, expect } from "@playwright/test";

test.describe("Ad strip", () => {
  test("renders the ad strip on the map with disclosure badge", async ({ page }) => {
    await page.goto("/");
    const dismiss = page.locator('[aria-label="Dismiss advertisements"]');
    await expect(dismiss).toBeVisible();
    await expect(page.getByText("Ad", { exact: true }).first()).toBeVisible();
  });

  test("dismisses the ad strip for the session", async ({ page }) => {
    await page.goto("/");
    const dismiss = page.locator('[aria-label="Dismiss advertisements"]');
    await dismiss.click();
    await expect(dismiss).toBeHidden();
  });

  // L3: the dismissal used to live in component state, so any remount or
  // reload resurrected the ad. It is now persisted to sessionStorage —
  // same tab keeps it hidden, a fresh tab starts visible again.
  test("dismissal survives a reload within the same tab (L3)", async ({ page }) => {
    await page.goto("/");
    const dismiss = page.locator('[aria-label="Dismiss advertisements"]');
    await dismiss.click();
    await expect(dismiss).toBeHidden();
    await page.reload();
    await expect(dismiss).toBeHidden();
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("ncr-startup-map-ads-dismissed:v1"),
      ),
    ).toBe("1");
  });
});
