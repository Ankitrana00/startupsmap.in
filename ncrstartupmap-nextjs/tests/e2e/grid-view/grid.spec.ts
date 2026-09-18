import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe("Grid View", () => {
  // M5 dual shell: both toolbars are always in the DOM (one display:none per
  // breakpoint), so bare role/text locators would double-match. Scope every
  // control to the desktop shell — these tests run at the desktop viewport.
  const desktopToolbar = (page: Page) =>
    page.locator('[data-testid="toolbar-desktop"]');
  const gridButton = (page: Page) =>
    desktopToolbar(page).locator('button:has-text("Grid")');

  test("renders the grid container", async ({ page }) => {
    await page.goto("/");
    await gridButton(page).click();
    // View switch settles slower in Firefox under parallel workers.
    await expect(page.locator('[data-testid="grid-container"]')).toBeVisible({
      timeout: 15000,
    });
  });

  test("displays startup cards", async ({ page }) => {
    await page.goto("/");
    await gridButton(page).click();
    await expect(page.locator('[data-testid="startup-card"]').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("filters grid results to empty for a no-match query", async ({ page }) => {
    await page.goto("/");
    await gridButton(page).click();
    await expect(page.locator('[data-testid="startup-card"]').first()).toBeVisible({
      timeout: 15000,
    });
    await desktopToolbar(page).getByRole("searchbox").fill("zzzz-no-match-query");
    await expect(page.locator('[data-testid="startup-card"]')).toHaveCount(0);
    await expect(page.getByText("No startups match these filters.")).toBeVisible();
  });
});
