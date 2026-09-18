import { test, expect } from "@playwright/test";

test.describe("Submit Flow", () => {
  test("should load submit page", async ({ page }) => {
    await page.goto("/submit");
    await expect(page.locator("h1:has-text('Submit a Startup')")).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/submit");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[data-error="name"]')).toBeVisible();
  });

  // Backend-dependent: needs a live Supabase/API environment, so it is NOT run
  // in CI (it would INSERT into the real startups table). Run locally with
  // credentials set.
  test.fixme("should submit valid form (needs live Supabase/API env)", async ({ page }) => {
    await page.goto("/submit");
    await page.locator('[name="name"]').fill("Test Startup");
    await page.locator('[name="email"]').fill("test@example.com");
    await page.locator('[name="description"]').fill("A test startup");
    await page.locator('[name="sector"]').selectOption("Fintech");
    await page.locator('[name="stage"]').selectOption("Seed");
    await page.locator('[name="area"]').selectOption("Gurugram");
    await page.locator('[name="founded"]').fill("2024");
    await page.locator('[name="address"]').fill("Test Address, Gurugram");
    await page.locator('[name="lat"]').fill("28.4595");
    await page.locator('[name="lng"]').fill("77.0266");
    await page.locator('button[type="submit"]').click();
    // Should redirect to success page
    await expect(page).toHaveURL(/\/submit\/success/);
    await expect(page.locator("h1:has-text('Thanks for your interest')")).toBeVisible();
  });
});
