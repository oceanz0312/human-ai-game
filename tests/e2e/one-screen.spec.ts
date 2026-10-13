import { expect, test } from "@playwright/test";
import { answer, assertOneScreen, assertRevealPrimaryAboveHeatmap, startGame, waitForPlayable } from "./helpers";

test.describe("@layout one-screen zero scroll", () => {
  test("home fits one viewport", async ({ page }) => {
    await page.goto("/");
    await assertOneScreen(page);
  });

  test("countdown and play fit one viewport", async ({ page }) => {
    await startGame(page);
    await assertOneScreen(page);
    await waitForPlayable(page, 1);
    await assertOneScreen(page);
    await expect(page.getByTestId("ai-danmaku")).toBeVisible();
    await expect(page.locator(".heatmap-cell")).toHaveCount(0);
    await expect(page.getByText(/AI 最看好|置信度/)).toHaveCount(0);
  });

  test("reveal primary is above heatmap without scrolling", async ({ page }) => {
    await startGame(page);
    await waitForPlayable(page, 1);
    await answer(page, 1, "correct");
    await assertOneScreen(page);
    await assertRevealPrimaryAboveHeatmap(page);
    await expect(page.locator(".reveal-top-actions .primary-action")).toBeVisible();
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
    await answer(page, 1, "wrong");
    await page.getByRole("button", { name: "下一关" }).click();
    await answer(page, 2, "wrong");
    await page.getByRole("button", { name: "下一关" }).click();
    await answer(page, 3, "wrong");
    await page.getByRole("button", { name: "下一关" }).click();
    await answer(page, 4, "wrong");
    await page.getByRole("button", { name: /^查看结果/ }).click();
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
