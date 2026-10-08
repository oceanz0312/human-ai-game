import { expect, test } from "@playwright/test";
import { answer, next, startGame, waitForPlayable } from "./helpers";

test("an image that fails to load never starts the countdown or costs a life", async ({ page }) => {
  await page.route("**/levels/v1/01.png", (route) => route.abort());
  await startGame(page);
  await expect(page.getByText("关卡加载失败，生命不会减少。")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".life.lost")).toHaveCount(0);
  await page.unroute("**/levels/v1/01.png");
  await page.getByRole("button", { name: "重新加载关卡" }).click();
  await waitForPlayable(page, 1);
  await expect(page.locator(".life.lost")).toHaveCount(0);
});

test("refreshing during a shown level settles it as a timeout", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await page.reload();
  await expect(page.getByText("答案揭晓")).toBeVisible();
  await expect(page.getByText("你超时了 · 失去 1 条命")).toBeVisible();
  await next(page);
  await waitForPlayable(page, 2);
  await expect(page.locator(".life.lost")).toHaveCount(1);
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
  await expect(page.getByRole("heading", { name: /你赢了|AI 赢了|AI 仍在判断/ })).toBeVisible();
  await expect(page.getByText("失去 1 条命")).toHaveCount(0);
});

test("the AI being offline does not cost the player a life", async ({ page }) => {
  await startGame(page);
  await answer(page, 1, "correct");
  await next(page);
  await answer(page, 2, "wrong");
  await expect(page.getByRole("heading", { name: "AI 掉线" })).toBeVisible();
  await expect(page.getByText("你答错了 · 失去 1 条命")).toBeVisible();
  await next(page);
  await waitForPlayable(page, 3);
  await expect(page.locator(".life.lost")).toHaveCount(1);
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
  await expect(page.getByText("你超时了 · 失去 1 条命")).toBeVisible();
});
