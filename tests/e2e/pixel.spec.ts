import { expect, test } from "@playwright/test";

/** Pixel faces only render crisply on their 12px grid (Fusion Pixel) — 12/24/36/48 and 24px steps above. */
const LEGAL = new Set([12, 24, 36, 48, 72, 96, 120, 144, 168]);

test.describe("@viewport pixel type system", () => {
  for (const path of ["/", "/zh", "/zh/spot-the-difference", "/games", "/zh/faq", "/zh/games/spot-the-difference/leaderboard"]) {
    test(`${path} renders pixel fonts only at grid sizes`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const report = await page.evaluate((legal) => {
        const bad: string[] = [];
        let pixelText = 0;
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
          const style = getComputedStyle(el);
          if (!/pixel/i.test(style.fontFamily.split(",")[0])) continue;
          pixelText++;
          const size = parseFloat(style.fontSize);
          if (!legal.includes(size)) bad.push(`${el.tagName}.${el.className} ${size}px`);
        }
        const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
        return { bad, pixelText, loaded };
      }, [...LEGAL]);
      expect(report.pixelText, "pixel display text present").toBeGreaterThan(0);
      expect(report.bad, "pixel text at off-grid sizes").toEqual([]);
      expect(report.loaded.some((family) => /pixelFont/.test(family)), "self-hosted pixel font loaded").toBe(true);
      // tokens: hard edges, no radius on the primary call to action
      const cta = page.locator(".primary-action").first();
      await expect(cta).toHaveCSS("border-radius", "0px");
    });
  }
});
