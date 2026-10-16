import { expect, test } from "@playwright/test";
import { assertOneScreen } from "./helpers";

test.describe("@layout level pages", () => {
  for (const url of ["/games/spot-the-difference/levels/1", "/games/spot-the-difference/levels/6", "/zh/games/spot-the-difference/levels/20"]) {
    test(`${url} fits one screen with unique level data`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByTestId("level-stats")).toBeVisible();
      await expect(page.locator("img.level-thumb")).toBeVisible();
      await assertOneScreen(page);
    });
  }
});

test("levels without enough runs are noindex and kept out of the sitemap", async ({ request }) => {
  const html = await (await request.get("/games/spot-the-difference/levels/19")).text();
  expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
  expect(html).toMatch(/<link rel="canonical" href="[^"]+\/games\/spot-the-difference\/levels\/19"/);
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toContain("/levels/19<");
  expect(xml).toContain("/games/spot-the-difference/leaderboard</loc>");
});

test("invalid levels are 404", async ({ request }) => {
  for (const n of ["0", "21", "abc"]) expect((await request.get(`/games/spot-the-difference/levels/${n}`)).status(), n).toBe(404);
});

test("Open Graph images exist per locale", async ({ request }) => {
  for (const url of ["/", "/zh/spot-the-difference", "/faq"]) {
    const html = await (await request.get(url)).text();
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    expect(og, url).toBeTruthy();
    const response = await request.get(new URL(og!).pathname);
    expect(response.status(), og).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});
