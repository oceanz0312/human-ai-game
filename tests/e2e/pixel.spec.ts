import { expect, test, type Page } from "@playwright/test";
import { answer, startGame, waitForPlayable } from "./helpers";

/** Pixel faces only render crisply on their 12px grid (Fusion Pixel) — 12/24/36/48 and 24px steps above. */
const LEGAL = [12, 24, 36, 48, 72, 96, 120, 144, 168];

async function pixelReport(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate((legal) => {
    const bad: string[] = [];
    let pixelText = 0;
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
      if (!el.getClientRects().length) continue;
      const style = getComputedStyle(el);
      if (!/pixel/i.test(style.fontFamily.split(",")[0])) continue;
      pixelText++;
      const size = parseFloat(style.fontSize);
      if (!legal.includes(size)) bad.push(`${el.tagName}.${el.className} ${size}px "${el.textContent!.trim().slice(0, 12)}"`);
    }
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
    return { bad, pixelText, loaded };
  }, LEGAL);
}

test.describe("@viewport pixel type system", () => {
  for (const path of ["/", "/hard", "/christmas", "/games", "/faq", "/games/spot-the-difference/leaderboard"]) {
    test(`${path} renders pixel fonts only at grid sizes`, async ({ page }) => {
      await page.goto(path);
      const report = await pixelReport(page);
      expect(report.pixelText, "pixel display text present").toBeGreaterThan(0);
      expect(report.bad, "pixel text at off-grid sizes").toEqual([]);
      expect(report.loaded.some((family) => /pixelFont/.test(family)), "self-hosted pixel font loaded").toBe(true);
      // tokens: hard edges, no radius on the page call to action (keyword pages: the secondary 20-level button)
      await expect(page.locator(".primary-action, .secondary-action").first()).toHaveCSS("border-radius", "0px");
    });
  }

  test("play and reveal render pixel fonts only at grid sizes", async ({ page }) => {
    await startGame(page);
    await waitForPlayable(page, 1);
    const play = await pixelReport(page);
    expect(play.bad, "play: off-grid pixel text").toEqual([]);
    // HUD row: every value stays on one line, and the stacked layout hides the timer bar
    for (const selector of [".game-hud .level", ".hud-timer .value"]) {
      const { height, size } = await page.locator(selector).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return { height: range.getBoundingClientRect().height, size: parseFloat(getComputedStyle(el).fontSize) };
      });
      expect(height, `${selector} on one line`).toBeLessThan(size * 1.8);
    }
    const viewport = page.viewportSize()!;
    if (viewport.width < 768 || viewport.height > viewport.width) await expect(page.locator(".hud-segments")).toBeHidden();
    else await expect(page.locator(".hud-segments")).toBeVisible();
    await expect(page.locator(".board").first()).toBeVisible();
    await answer(page, 1, "correct");
    await page.waitForTimeout(300);
    const reveal = await pixelReport(page);
    expect(reveal.bad, "reveal: off-grid pixel text").toEqual([]);
  });
});
