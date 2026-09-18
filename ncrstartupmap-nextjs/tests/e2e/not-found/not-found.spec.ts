import { test, expect } from "@playwright/test";

// C2: branded 404 fallback. Both root-level and nested unmatched URLs must
// land on the fallback (NOTE: `/jobs/<id>` matches the existing stub dynamic
// route and returns 200 — only genuinely unmatched patterns 404).
test.describe("Not Found", () => {
  test("renders a branded 404 with a way back to the map", async ({ page }) => {
    await page.goto("/definitely-not-a-page");
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    const back = page.getByRole("link", { name: /Back to the map/ });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("deep unmatched routes also land on the fallback", async ({ page }) => {
    await page.goto("/this/does/not/exist");
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to the map/ })).toBeVisible();
  });
});
