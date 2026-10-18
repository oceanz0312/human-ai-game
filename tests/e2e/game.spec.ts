import { expect, test } from "@playwright/test";
import { answer, assertMobileLayout, next, recordForeignRequests, screenshot, startGame, waitForPlayable, pickOpponent } from "./helpers";
import { rx, t, START } from "./t";

test("@layout a full clear run follows the approved mobile layout on every view", async ({ page }, testInfo) => {
  const foreign = recordForeignRequests(page);
  await page.goto("/spot-the-difference-game");
  await expect(page.getByRole("link", { name: "Spot The Difference Game" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Spot the Difference Game" })).toBeVisible();
  await expect(page.getByRole("button", { name: START })).toHaveCount(1);
  await assertMobileLayout(page);
  await screenshot(page, testInfo, "1-home");

  await page.getByRole("button", { name: START }).click();
  await pickOpponent(page);
  await expect(page.locator(".countdown-overlay")).toBeVisible();

  await waitForPlayable(page, 1);
  await expect(page.getByRole("button", { name: /^Row \d, column \d$/ })).toHaveCount(9);
  await assertMobileLayout(page);
  await screenshot(page, testInfo, "2-game-3x3");

  for (let n = 1; n <= 20; n += 1) {
    if (n === 6) {
      await waitForPlayable(page, 6);
      await expect(page.getByRole("button", { name: /^Row \d, column \d$/ })).toHaveCount(81);
      await assertMobileLayout(page);
      await screenshot(page, testInfo, "4-game-9x9");
    }
    await answer(page, n, "correct");
    if (n === 1) {
      await expect(page.getByRole("heading", { name: new RegExp(`${rx("你赢了")}|${rx("AI 赢了")}|${rx("AI 还在分析")}`) })).toBeVisible();
      const details = page.getByRole("button", { name: t("AI 详情") });
      // Stacked layouts (phones, portrait tablets) open AI details in a sheet; side-panel layouts show insights inline.
      if (await details.isVisible()) await expect(details).toBeEnabled();
      else await expect(page.getByTestId("ai-insights").first()).toBeVisible();
      await expect(page.getByTestId("ai-danmaku")).toBeVisible();
      await expect(page.getByTestId("reveal-next")).toBeVisible();
      await expect(page.getByTestId("reveal-board")).toBeVisible();
      await assertMobileLayout(page);
      await screenshot(page, testInfo, "3-reveal");
    }
    if (n === 2) await expect(page.getByRole("heading", { name: new RegExp(rx("AI 掉线了")) })).toBeVisible();
    await next(page);
  }

  await page.waitForURL(/\/result\//);
  await expect(page.getByTestId("reached-level")).toHaveText("20");
  await expect(page.getByRole("heading", { name: t("挑战完成") })).toBeVisible();
  await expect(page.getByRole("button", { name: t("生成战绩海报") })).toBeVisible();
  await expect(page.getByRole("button", { name: t("再玩一次") })).toBeVisible();
  await expect(page.locator(".board-rows .me")).toContainText(t("第 {n} 关", { n: 20 }));
  await assertMobileLayout(page);
  await screenshot(page, testInfo, "5-result");

  expect(foreign, "the H5 only talks to its own origin").toEqual([]);
});

test("three failures end the run at the third failed level", async ({ page }) => {
  await startGame(page);
  await answer(page, 1, "wrong");
  await expect(page.getByRole("heading", { name: new RegExp(`${rx("AI 赢了")}|${rx("无人获胜")}`) })).toBeVisible();
  await expect(page.getByText(t(" · 用掉 1 次机会").trim())).toBeVisible();
  await next(page);
  await answer(page, 2, "correct");
  await next(page);
  await answer(page, 3, "wrong");
  await next(page);
  await waitForPlayable(page, 4);
  await expect(page.locator(".chance.used")).toHaveCount(2);
  await answer(page, 4, "wrong");
  await expect(page.getByRole("button", { name: new RegExp(`^${rx("查看结果")}`) })).toBeVisible();
  await next(page);
  await page.waitForURL(/\/result\//);
  await expect(page.getByTestId("reached-level")).toHaveText("04");
  await expect(page.getByRole("heading", { name: t("挑战结束") })).toBeVisible();
});

test("the reveal screen waits for a tap and does not auto-advance", async ({ page }) => {
  await startGame(page);
  await answer(page, 1, "correct");
  await expect(page.getByRole("button", { name: t("下一关") })).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /^Row \d, column \d$/ })).toHaveCount(0);
  await next(page);
  await waitForPlayable(page, 2);
});

test("a level that runs out of time counts as a timeout and keeps going", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await expect(page.getByTestId("timer")).not.toHaveText("08.00", { timeout: 2000 });
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(`${t("你超时了")}${t(" · 用掉 1 次机会")}`)).toBeVisible();
  await next(page);
  await waitForPlayable(page, 2);
  await expect(page.locator(".chance.used")).toHaveCount(1);
});

test("replay starts a fresh run from level 1", async ({ page }) => {
  await startGame(page);
  for (let n = 1; n <= 3; n += 1) {
    await answer(page, n, "wrong");
    await next(page);
  }
  await page.waitForURL(/\/result\//);
  await page.getByRole("button", { name: t("再玩一次") }).click();
  await page.waitForURL(/\/play\//);
  await waitForPlayable(page, 1);
  await expect(page.locator(".chance.used")).toHaveCount(0);
});
