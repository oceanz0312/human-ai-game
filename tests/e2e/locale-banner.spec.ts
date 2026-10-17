import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow } from "./helpers";

test("a Chinese browser on the English page gets a banner, not a redirect", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  const response = await page.goto("/spot-the-difference");
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/spot-the-difference");
  const banner = page.getByTestId("locale-banner");
  await expect(banner).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await banner.getByRole("link", { name: "中文" }).click();
  await page.waitForURL(/\/zh\/spot-the-difference$/);
  await expect(page.getByTestId("locale-banner")).toHaveCount(0);
  await context.close();
});

test("the banner can be dismissed and stays dismissed", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto("/faq");
  await page.getByTestId("locale-banner").getByRole("button").click();
  await expect(page.getByTestId("locale-banner")).toHaveCount(0);
  await page.goto("/about");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("locale-banner")).toHaveCount(0);
  await context.close();
});

test("matching browser language shows no banner", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("locale-banner")).toHaveCount(0);
});
