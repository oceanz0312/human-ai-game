import { expect, test } from "@playwright/test";

test("icons and manifest are served", async ({ page, request }) => {
  for (const path of ["/favicon.ico", "/icon.png", "/apple-icon.png", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-icon\.png/);
});

test("about and privacy show the contact email", async ({ page }) => {
  for (const path of ["/about", "/privacy"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "support@oceanz.me" })).toHaveAttribute("href", "mailto:support@oceanz.me");
  }
});
