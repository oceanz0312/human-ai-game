import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const OUT = process.env.LIVE_OUT || "/workspace/redesign-shots/seo";
mkdirSync(OUT, { recursive: true });
const PAGES = ["/", "/spot-the-difference-game", "/find-the-difference", "/easy", "/hard", "/for-kids", "/christmas", "/pictures", "/printable", "/how-to-play", "/human-vs-ai", "/faq"];

test("live keyword pages: first screen, quick board round, screenshots", async ({ page }, info) => {
  const vp = info.project.name;
  for (const path of PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    const name = path === "/" ? "home" : path.slice(1);
    await page.screenshot({ path: `${OUT}/${name}-${vp}.png` });
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(scroll, `${path} no sideways scroll`).toBeLessThanOrEqual(1);
  }
  // Home: the quick board is playable right in the first screen (3 puzzles, no server calls, no daily limit).
  // Hero v2: no Play button on the board; reduced motion → no auto-start, the first tap on a cell starts in place.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stage = (await page.locator(".quick-stage").boundingBox())!;
  expect(stage.y + stage.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  await expect(page.locator(".primary-action")).toHaveCount(1);
  await page.getByTestId("quick-cell").first().click();
  await expect(page.getByTestId("quick-board")).toHaveAttribute("data-phase", "playing");
  for (let round = 0; round < 3; round += 1) {
    await page.waitForTimeout(600 + round * 400);
    await page.getByTestId("quick-cell").nth(round).click();
    await expect(page.getByTestId("quick-result")).toBeVisible();
    if (round === 0) await page.screenshot({ path: `${OUT}/home-quick-reveal-${vp}.png` });
    await page.getByTestId("quick-next").click();
  }
  await expect(page.getByTestId("quick-done")).toBeVisible();
  await page.screenshot({ path: `${OUT}/home-quick-done-${vp}.png` });
});
