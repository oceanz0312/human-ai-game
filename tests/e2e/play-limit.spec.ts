import { expect, test } from "@playwright/test";
import { pickOpponent } from "./helpers";

// This spec plays as a real visitor: no bypass header.
test.use({ extraHTTPHeaders: {} });

test("@viewport daily play limit: 3 runs a day, then a friendly blocked state with a reset countdown", async ({ page }) => {
  await page.goto("/zh/spot-the-difference");
  const badge = page.getByTestId("play-limit");
  await expect(badge).toHaveText(/今日剩余 \d\/3/);
  const left = Number((await badge.textContent())!.match(/今日剩余 (\d)/)![1]);
  for (let index = 0; index < left; index += 1) {
    await page.goto("/zh/spot-the-difference");
    await page.getByRole("button", { name: /开始/ }).first().click();
    await pickOpponent(page);
  }
  await page.goto("/zh/spot-the-difference");
  const blocked = page.getByTestId("play-limit-blocked");
  await expect(blocked).toBeVisible();
  await expect(blocked).toContainText("今天的 3 局已经打完啦");
  await expect(blocked).toContainText(/\d\d:\d\d:\d\d 后恢复/);
  await expect(blocked.getByRole("button", { name: "分享给朋友" })).toBeVisible();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(scroll).toBeLessThanOrEqual(0);
});
