import { expect, test } from "@playwright/test";
import { START } from "./t";

/** Keyword pages on phones (哥飞-adjusted plan): themed board = the one primary action, fully in the first screen;
 * the 20-level button is a secondary button under it, still visible; no horizontal scroll. Visible-area sizes
 * (browser chrome removed): iPhone 12–15 Safari, Android Chrome, iPhone SE Safari, plus the full 390x844. */
const VIEWPORTS = [
  { width: 390, height: 664 },
  { width: 360, height: 628 },
  { width: 375, height: 553 },
  { width: 390, height: 844 },
];
const PAGES: Array<[string, string]> = [
  ["/easy", "▶ Tap to play an easy round"],
  ["/hard", "▶ Tap to play a hard round"],
  ["/for-kids", "▶ Tap to play a round for kids"],
  ["/christmas", "▶ Tap to play a Christmas round"],
  ["/halloween", "▶ Tap to play a Halloween round"],
  ["/thanksgiving", "▶ Tap to play a Thanksgiving round"],
  ["/pictures", "▶ Tap to play a quick round"],
  ["/spot-the-difference-game", "▶ Tap to play a quick round"],
  ["/find-the-difference", "▶ Tap to play a quick round"],
];

test.describe("keyword pages small-screen first screen", () => {
  for (const [path, label] of PAGES) {
    test(`${path}: board + secondary 20-level CTA in the first screen`, async ({ page }) => {
      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        await page.goto(path);
        const where = `${path} @ ${vp.width}x${vp.height}`;
        await expect(page.getByTestId("quick-start"), where).toHaveText(label);
        const m = await page.evaluate(() => {
          const box = (el: Element | null) => (el ? el.getBoundingClientRect().toJSON() : null);
                    const primaries = Array.from(document.querySelectorAll(".kw-hero .primary-action")).filter((e) => (e as HTMLElement).offsetParent);
          return {
            scrollWidth: document.documentElement.scrollWidth,
            stage: box(document.querySelector(".kw-hero .quick-stage")),
            cta: box(document.querySelector("[data-testid='kw-cta-secondary'] .px-btn")),
            badge: box(document.querySelector("[data-testid='kw-cta-secondary'] .play-limit-badge")),
            // Cell size the 8x8 final round will get: stage content box minus 7 grid gaps, over 8.
            cell8: (() => {
              
              const grid = document.querySelector(".kw-hero .quick-grid") as HTMLElement;
              const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
              return (grid.getBoundingClientRect().width - 7 * gap) / 8;
            })(),
            primaries: primaries.length,
          };
        });
        expect(m.scrollWidth, `${where} no horizontal scroll`).toBeLessThanOrEqual(vp.width);
        expect(m.stage!.top, `${where} board top`).toBeGreaterThanOrEqual(0);
        expect(m.stage!.bottom, `${where} board fully visible`).toBeLessThanOrEqual(vp.height);
        expect(m.cta!.bottom, `${where} 20-level CTA visible`).toBeLessThanOrEqual(vp.height);
        expect(m.cta!.top, `${where} CTA under the board`).toBeGreaterThanOrEqual(m.stage!.bottom);
        if (m.badge) expect(m.badge.bottom, `${where} daily badge not cut off`).toBeLessThanOrEqual(vp.height);
        expect(m.primaries, `${where} 20-level CTA is not a primary button`).toBe(0);
        if (path === "/hard") expect(m.cell8, `${where} 8x8 cell >= 34px`).toBeGreaterThanOrEqual(34);
        await expect(page.getByRole("button", { name: START })).toBeVisible();
      }
    });
  }
});
