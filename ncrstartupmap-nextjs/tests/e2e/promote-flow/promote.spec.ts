import { test, expect } from "@playwright/test";

test.describe("Promote Flow", () => {
  test("should load promote page", async ({ page }) => {
    await page.goto("/promote");
    await expect(page.locator("h1:has-text('Promote Your Startup')")).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/promote");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[data-error="companyName"]')).toBeVisible();
    await expect(page.locator('[data-error="pocName"]')).toBeVisible();
  });

  // Backend-dependent: needs a live SMTP/API environment, so it is NOT run in
  // CI (it would POST to the real promote API). Run locally with credentials set.
  test.fixme("should submit valid form (needs live SMTP/API env)", async ({ page }) => {
    await page.goto("/promote");
    await page.locator('[name="companyName"]').fill("Ad Buyer Co");
    await page.locator('[name="pocName"]').fill("Jane Smith");
    await page.locator('[name="pocEmail"]').fill("jane@adbuyer.com");
    await page.locator('[name="contactNumber"]').fill("+91 98765 43210");
    await page.locator('[name="message"]').fill("We want a featured ad slot for a month.");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("[data-success]")).toBeVisible();
  });
});