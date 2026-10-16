import { expect, test } from "@playwright/test";
import { answer, assertDanmakuOffBoard, assertOneScreen, assertRevealNextBelowBoard, boardSize, startGame, waitForPlayable } from "./helpers";

test.describe("@layout one-screen zero scroll", () => {
  test("home fits one viewport with the race animation", async ({ page }) => {
    await page.goto("/zh");
    await assertOneScreen(page);
    await expect(page.getByTestId("home-race")).toBeVisible();
    const start = await page.getByRole("button", { name: "开始挑战" }).boundingBox();
    expect(start!.y + start!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(page.locator("body")).not.toContainText(/命|20 关/);
  });

  test("countdown and play fit one viewport", async ({ page }) => {
    await startGame(page);
    await assertOneScreen(page);
    await waitForPlayable(page, 1);
    await assertOneScreen(page);
    await expect(page.getByTestId("ai-danmaku")).toBeVisible();
    await expect(page.locator(".heatmap-cell")).toHaveCount(0);
    await expect(page.getByText(/AI 最看好|置信度/)).toHaveCount(0);
    await assertDanmakuOffBoard(page);
  });

  test("reveal keeps the play board size and puts next below it", async ({ page }) => {
    await startGame(page);
    await waitForPlayable(page, 1);
    const play = await boardSize(page);
    await answer(page, 1, "correct");
    await assertOneScreen(page);
    const reveal = await boardSize(page);
    expect(Math.abs(play!.width - reveal!.width), "board width stable").toBeLessThanOrEqual(2);
    expect(Math.abs(play!.height - reveal!.height), "board height stable").toBeLessThanOrEqual(2);
    await assertRevealNextBelowBoard(page);
    for (let i = 0; i < 4; i += 1) {
      await assertDanmakuOffBoard(page);
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: "AI 详情" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("result and share landing fit after a short run", async ({ page }) => {
    await startGame(page);
    for (let n = 1; n <= 3; n += 1) {
      await answer(page, n, "wrong");
      await page.getByRole("button", { name: /^(下一关|查看结果)/ }).click();
    }
    await page.waitForURL(/\/result\//);
    await assertOneScreen(page);
    const sharePath = await page.evaluate(() => window.location.pathname.replace("/result/", "/share/"));
    await page.goto(sharePath);
    await assertOneScreen(page);
  });

  test("poster dialog fits one viewport", async ({ page }) => {
    await startGame(page);
    for (let n = 1; n <= 3; n += 1) {
      await answer(page, n, "wrong");
      await page.getByRole("button", { name: /^(下一关|查看结果)/ }).click();
    }
    await page.waitForURL(/\/result\//);
    await page.getByRole("button", { name: "生成战绩海报" }).click();
    await expect(page.locator(".poster-shell")).toBeVisible();
    await assertOneScreen(page);
  });
});

test("reduced motion danmaku has no horizontal translate animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startGame(page);
  await waitForPlayable(page, 1);
  const hasTranslate = await page.evaluate(() => {
    const item = document.querySelector(".ai-danmaku-item");
    if (!item) return false;
    const animation = getComputedStyle(item).animationName;
    return animation.includes("danmaku-drift");
  });
  expect(hasTranslate).toBe(false);
});
