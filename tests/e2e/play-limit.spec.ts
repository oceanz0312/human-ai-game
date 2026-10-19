import { expect, test } from "@playwright/test";
import { pickOpponent } from "./helpers";
import { t } from "./t";

// This spec plays as a real visitor: no bypass header.
test.use({ extraHTTPHeaders: {} });

test("@viewport daily play limit: 3 runs a day, then a friendly blocked state with a reset countdown", async ({ page }) => {
  await page.goto("/spot-the-difference-game");
  const badge = page.getByTestId("play-limit");
  await expect(badge).toHaveText(/Today \d\/3 left/);
  const left = Number((await badge.textContent())!.match(/Today (\d)/)![1]);
  for (let index = 0; index < left; index += 1) {
    await page.goto("/spot-the-difference-game");
    await page.getByRole("button", { name: /^Start|^Spot the Difference Game: 20 levels/ }).first().click();
    await pickOpponent(page);
  }
  await page.goto("/spot-the-difference-game");
  const blocked = page.getByTestId("play-limit-blocked");
  await expect(blocked).toBeVisible();
  await expect(blocked).toContainText(t("今天的 {n} 局已经打完啦", { n: 3 }));
  await expect(blocked).toContainText(/Back in \d\d:\d\d:\d\d/);
  await expect(blocked.getByRole("button", { name: t("分享给朋友") })).toBeVisible();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(scroll).toBeLessThanOrEqual(0);

  // Identity is a random key in localStorage (no fingerprint): clearing it is a fresh allowance.
  const key = await page.evaluate(() => localStorage.getItem("hai_player_key"));
  expect(key).toMatch(/^[0-9a-f-]{36}$/);
  await page.evaluate(() => localStorage.removeItem("hai_player_key"));
  await page.goto("/spot-the-difference-game");
  await expect(page.getByTestId("play-limit")).toHaveText(t("今日剩余 {left}/{limit}", { left: 3, limit: 3 }));
  expect(await page.evaluate(() => localStorage.getItem("hai_player_key"))).not.toBe(key);
});
