import { expect, test } from "@playwright/test";
import { answer, next, startGame, waitForPlayable } from "./helpers";
import { rx, t } from "./t";

test("an image that fails to load never starts the countdown or costs a life", async ({ page }) => {
  await page.route("**/levels/v1/01.png", (route) => route.abort());
  await startGame(page);
  await expect(page.getByText(t("关卡加载失败，不会扣除机会。"))).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".chance.used")).toHaveCount(0);
  await page.unroute("**/levels/v1/01.png");
  await page.getByRole("button", { name: t("重新加载关卡") }).click();
  await waitForPlayable(page, 1);
  await expect(page.locator(".chance.used")).toHaveCount(0);
});

test("refreshing during a shown level settles it as a timeout", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await page.reload();
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible();
  await expect(page.getByText(`${t("你超时了")}${t(" · 用掉 1 次机会")}`)).toBeVisible();
  await next(page);
  await waitForPlayable(page, 2);
  await expect(page.locator(".chance.used")).toHaveCount(1);
});

test("a dropped submission is retried with the original locked answer", async ({ page }) => {
  await startGame(page);
  let failures = 0;
  await page.route("**/api/rounds/*/submit", async (route) => {
    if (failures < 1) {
      failures += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });
  await answer(page, 1, "correct");
  expect(failures).toBe(1);
  await expect(page.getByRole("heading", { name: new RegExp(`${rx("你赢了")}|${rx("AI 赢了")}|${rx("AI 还在分析")}`) })).toBeVisible();
  await expect(page.getByText(t(" · 用掉 1 次机会").trim())).toHaveCount(0);
});

test("the AI being offline does not cost the player a life", async ({ page }) => {
  await startGame(page);
  await answer(page, 1, "correct");
  await next(page);
  await answer(page, 2, "wrong");
  await expect(page.getByRole("heading", { name: new RegExp(rx("AI 掉线了")) })).toBeVisible();
  await expect(page.getByText(`${t("你答错了")}${t(" · 用掉 1 次机会")}`)).toBeVisible();
  await next(page);
  await waitForPlayable(page, 3);
  await expect(page.locator(".chance.used")).toHaveCount(1);
});

test("backgrounding does not pause the absolute deadline", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(8500);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText(`${t("你超时了")}${t(" · 用掉 1 次机会")}`)).toBeVisible();
});
