import { expect, test } from "@playwright/test";
import { answer, assertMobileLayout, next, recordForeignRequests, screenshot, startGame, waitForPlayable } from "./helpers";

test("@layout a full clear run follows the approved mobile layout on every view", async ({ page }, testInfo) => {
  const foreign = recordForeignRequests(page);
  await page.goto("/");
  await expect(page.getByText("HUMAN / AI")).toBeVisible();
  await expect(page.getByRole("heading", { name: /你比 AI\s*更快吗/ })).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(1);
  await assertMobileLayout(page);
  await screenshot(page, testInfo, "1-home");

  await page.getByRole("button", { name: "开始挑战" }).click();
  await page.waitForURL(/\/play\//);
  await expect(page.locator(".countdown-overlay")).toBeVisible();

  await waitForPlayable(page, 1);
  await expect(page.getByRole("button", { name: /第 \d 行第 \d 列/ })).toHaveCount(9);
  await expect(page.getByText("AI 正在寻找")).toBeVisible();
  await expect(page.getByText(/AI 赢了|你赢了|AI 掉线/)).toHaveCount(0);
  await assertMobileLayout(page);
  await screenshot(page, testInfo, "2-game-3x3");

  for (let n = 1; n <= 20; n += 1) {
    if (n === 6) {
      await waitForPlayable(page, 6);
      await expect(page.getByRole("button", { name: /第 \d 行第 \d 列/ })).toHaveCount(81);
      await assertMobileLayout(page);
      await screenshot(page, testInfo, "4-game-9x9");
    }
    await answer(page, n, "correct");
    if (n === 1) {
      await expect(page.getByRole("heading", { name: /你赢了|AI 赢了|AI 仍在判断/ })).toBeVisible();
      await assertMobileLayout(page);
      await screenshot(page, testInfo, "3-reveal");
    }
    if (n === 2) await expect(page.getByRole("heading", { name: "AI 掉线" })).toBeVisible();
    await next(page);
  }

  await page.waitForURL(/\/result\//);
  await expect(page.getByTestId("reached-level")).toHaveText("20");
  await expect(page.getByText("挑战完成")).toBeVisible();
  await expect(page.getByRole("button", { name: "生成战绩海报" })).toBeVisible();
  await expect(page.getByRole("button", { name: "再玩一次" })).toBeVisible();
  await expect(page.locator(".board-rows .me")).toContainText("第 20 关");
  await assertMobileLayout(page);
  await screenshot(page, testInfo, "5-result");

  expect(foreign, "the H5 only talks to its own origin").toEqual([]);
});

test("three failures end the run at the third failed level", async ({ page }) => {
  await startGame(page);
  await answer(page, 1, "wrong");
  await expect(page.getByRole("heading", { name: /AI 赢了|无人获胜/ })).toBeVisible();
  await expect(page.getByText("失去 1 条命")).toBeVisible();
  await next(page);
  await answer(page, 2, "correct");
  await next(page);
  await answer(page, 3, "wrong");
  await next(page);
  await waitForPlayable(page, 4);
  await expect(page.locator(".life.lost")).toHaveCount(2);
  await answer(page, 4, "wrong");
  await expect(page.getByRole("button", { name: /^查看结果/ })).toBeVisible();
  await next(page);
  await page.waitForURL(/\/result\//);
  await expect(page.getByTestId("reached-level")).toHaveText("04");
  await expect(page.getByText("挑战结束")).toBeVisible();
});

test("a level that runs out of time counts as a timeout and keeps going", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await expect(page.getByTestId("timer")).not.toHaveText("08.00", { timeout: 2000 });
  await expect(page.getByText("答案揭晓")).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText("你超时了 · 失去 1 条命")).toBeVisible();
  await next(page);
  await waitForPlayable(page, 2);
  await expect(page.locator(".life.lost")).toHaveCount(1);
});

test("replay starts a fresh run from level 1", async ({ page }) => {
  await startGame(page);
  for (let n = 1; n <= 3; n += 1) {
    await answer(page, n, "wrong");
    await next(page);
  }
  await page.waitForURL(/\/result\//);
  await page.getByRole("button", { name: "再玩一次" }).click();
  await page.waitForURL(/\/play\//);
  await waitForPlayable(page, 1);
  await expect(page.locator(".life.lost")).toHaveCount(0);
});
