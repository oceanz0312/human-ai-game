import { expect, test } from "@playwright/test";
import {
  answer,
  assertNoForbiddenWords,
  assertNoHorizontalOverflow,
  assertOneScreen,
  assertRevealNextBelowBoard,
  boardSize,
  startGame,
  waitForPlayable,
} from "./helpers";

/** Acceptance at 1440x900 · 1280x720 · 1024x768 · 820x1180 · 390x844 · 375x667 (see playwright.config projects). */
test.describe("@viewport web-first responsive", () => {
  test("play and reveal are one viewport, same board, next under the board", async ({ page }) => {
    await startGame(page);
    await waitForPlayable(page, 1);
    await assertOneScreen(page);
    await assertNoForbiddenWords(page);
    await expect(page.getByTestId("ai-terminal")).toBeVisible();
    // the breadcrumb is never truncated, and the AI terminal shows at least 2 complete lines
    const crumb = await page.locator(".game-crumb").evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, text: el.textContent }));
    expect(crumb.scroll, `breadcrumb "${crumb.text}" fits`).toBeLessThanOrEqual(crumb.client + 1);
    await expect
      .poll(
        () =>
          page.getByTestId("ai-terminal").evaluate((terminal) => {
            const body = terminal.querySelector(".ai-terminal-body")!.getBoundingClientRect();
            return [...terminal.querySelectorAll(".term-line")].filter((line) => {
              const rect = line.getBoundingClientRect();
              return rect.height > 0 && rect.top >= body.top - 1 && rect.bottom <= body.bottom + 1;
            }).length;
          }),
        { message: "complete terminal lines" },
      )
      .toBeGreaterThanOrEqual(2);
    const play = await boardSize(page);
    expect(play!.width, "board is a usable square").toBeGreaterThanOrEqual(300);

    await answer(page, 1, "correct");
    await assertOneScreen(page);
    await assertNoForbiddenWords(page);
    const reveal = await boardSize(page);
    expect(Math.abs(play!.width - reveal!.width), "same board width").toBeLessThanOrEqual(1);
    expect(Math.abs(play!.height - reveal!.height), "same board height").toBeLessThanOrEqual(1);
    expect(Math.abs(play!.x - reveal!.x), "same board x").toBeLessThanOrEqual(1);
    expect(Math.abs(play!.y - reveal!.y), "same board y").toBeLessThanOrEqual(1);
    await assertRevealNextBelowBoard(page);

    // A wrong answer reveal keeps the same geometry too.
    await page.getByTestId("reveal-next").click();
    await answer(page, 2, "wrong");
    await assertOneScreen(page);
    const wrong = await boardSize(page);
    expect(Math.abs(play!.width - wrong!.width)).toBeLessThanOrEqual(1);
    await assertRevealNextBelowBoard(page);
    await page.getByTestId("reveal-next").click();
    await waitForPlayable(page, 3);
    await expect(page.locator(".chance.used")).toHaveCount(1);
  });

  test("Enter on the reveal advances only when pressed", async ({ page }) => {
    await startGame(page);
    await answer(page, 1, "correct");
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("reveal-next"), "no auto-advance").toBeVisible();
    await page.keyboard.press("Enter");
    await waitForPlayable(page, 2);
  });

  for (const path of ["/zh", "/", "/zh/spot-the-difference", "/games", "/zh/faq", "/games/spot-the-difference/leaderboard"]) {
    test(`${path} has no sideways scroll or life wording`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await assertNoHorizontalOverflow(page);
      await assertNoForbiddenWords(page);
    });
  }
});
