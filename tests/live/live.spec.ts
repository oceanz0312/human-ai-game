import { appendFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { LEVELS_V1 } from "../../src/server/levels/spec";

const OUT = process.env.LIVE_OUT || "/workspace/redesign-shots/seo";
const LOG = `${OUT}/live-e2e.jsonl`;
mkdirSync(OUT, { recursive: true });
const pad2 = (n: number) => String(n).padStart(2, "0");
const cell = (choice: string) => {
  const [, r, c] = /^r(\d)c(\d)$/.exec(choice)!;
  return `Row ${r}, column ${c}`;
};

async function oneScreen(page: Page) {
  const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth }));
  expect(m.h, "no vertical scroll").toBeLessThanOrEqual(m.ih + 1);
  expect(m.w, "no horizontal scroll").toBeLessThanOrEqual(m.iw + 1);
}

async function playable(page: Page, n: number) {
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator(".game-hud .level")).toHaveText(`${pad2(n)} / 20`, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Row 1, column 1" })).toBeEnabled({ timeout: 30_000 });
}

test("live formal run against Luna AI (simulated)", async ({ page }, info) => {
  const vp = info.project.name;
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}-${vp}.png` });
  const sessions: string[] = [];
  page.on("response", async (res) => {
    if (res.url().endsWith("/api/sessions") && res.request().method() === "POST" && res.status() === 201) {
      const body = await res.json().catch(() => null);
      if (body?.id) sessions.push(body.id);
    }
  });
  await page.goto("/spot-the-difference-game");
  await page.getByRole("button", { name: /^Spot the Difference Game: 20 levels vs AI/ }).click();
  await expect(page.getByTestId("opponent-select")).toBeVisible();
  await shot("opponent-select");
  await page.getByRole("button", { name: /^Fight/ }).click();
  await page.waitForURL(/\/play\//);
  await expect(page.locator(".fx-fight")).toBeVisible({ timeout: 8_000 });

  const timings: Array<Record<string, unknown>> = [];
  // levels 1-3: correct (win/lose depends on the real race); 4-6: wrong → run ends after 3 misses.
  for (let n = 1; n <= 6; n += 1) {
    await playable(page, n);
    const spec = LEVELS_V1[n - 1];
    const correct = n <= 3;
    if (n === 1) {
      await page.waitForTimeout(250);
      await shot("streaming-captions");
    }
    if (n === 2) {
      // let Luna AI finish first to show the AI-locked state
      await expect(page.getByText(/AI answered/).first()).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
      await shot("ai-locked");
    }
    const choice = correct ? spec.correctChoice : spec.choices.find((c) => c !== spec.correctChoice)!;
    await page.evaluate(() => {
      const w = window as unknown as { __revealAt?: number; __tapAt?: number };
      w.__revealAt = undefined;
      w.__tapAt = undefined;
      document.addEventListener("pointerdown", () => (w.__tapAt = performance.now()), { once: true, capture: true });
      const obs = new MutationObserver(() => {
        if (document.querySelector('.game-stage[data-phase="reveal"]')) {
          w.__revealAt = performance.now();
          obs.disconnect();
        }
      });
      obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-phase"] });
    });
    const t0 = Date.now();
    await page.getByRole("button", { name: cell(choice) }).click();
    const waiting = await page.getByTestId("ai-waiting").isVisible().catch(() => false);
    await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible({ timeout: 30_000 });
    const precise = await page.evaluate(() => {
      const w = window as unknown as { __revealAt?: number; __tapAt?: number };
      return w.__revealAt && w.__tapAt ? Math.round(w.__revealAt - w.__tapAt) : null;
    });
    const tapToReveal = precise ?? Date.now() - t0;
    if (n === 1 || n === 4) {
      await page.waitForTimeout(120);
      await shot(n === 1 ? "hit-effect" : "miss-effect");
    }
    const banner = page.getByTestId("result-banner");
    const outcome = (await banner.count()) ? await banner.getAttribute("class") : null;
    if (outcome?.includes("win")) await shot("win-banner");
    if (outcome?.includes("lose")) await shot("lose-banner");
    await oneScreen(page);
    const aiText = await page.locator(".term-summary").first().textContent().catch(() => null);
    timings.push({ level: n, correct, tapToRevealMs: tapToReveal, sawWaiting: waiting, banner: outcome, ai: aiText?.trim() });
    const next = page.getByTestId("reveal-next");
    await next.click();
  }
  await page.waitForURL(/\/result\//, { timeout: 30_000 });
  await expect(page.getByTestId("result-grid")).toBeVisible();
  await page.screenshot({ path: `${OUT}/result-grid-${vp}.png`, fullPage: true });
  await page.getByRole("button", { name: "Create result poster" }).click();
  await expect(page.getByRole("dialog", { name: "Result poster" }).locator("img")).toBeVisible({ timeout: 20_000 });
  await shot("share-card");
  appendFileSync(LOG, JSON.stringify({ vp, at: new Date().toISOString(), sessions, timings }) + "\n");
});
