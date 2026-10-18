import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow } from "./helpers";

test.describe("@layout level pages", () => {
  for (const url of ["/games/spot-the-difference/levels/1", "/games/spot-the-difference/levels/6", "/games/spot-the-difference/levels/20"]) {
    test(`${url} renders unique level data`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByTestId("level-stats")).toBeVisible();
      await expect(page.locator("img.level-thumb")).toBeVisible();
      await assertNoHorizontalOverflow(page);
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
  for (const url of ["/", "/find-the-difference", "/faq"]) {
    const html = await (await request.get(url)).text();
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    expect(og, url).toBeTruthy();
    const response = await request.get(new URL(og!).pathname);
    expect(response.status(), og).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

test("each difficulty band has its own keyword title, description and H1", async ({ request }) => {
  const expectations: [string, RegExp, RegExp][] = [
    ["/games/spot-the-difference/levels/1", /<title>Spot the Difference Level 1 – Easy Odd One Out, 8s/, /<h1[^>]*>Spot the Difference Level 1: Find the Odd One Out<\/h1>/],
    ["/games/spot-the-difference/levels/7", /<title>Hard Spot the Difference Level 7 \(9×9, 6\.5s Timer\)/, /<h1[^>]*>Hard Spot the Difference: Level 7<\/h1>/],
    ["/games/spot-the-difference/levels/20", /<title>Expert Spot the Difference Level 20: 3s to Beat the AI/, /<h1[^>]*>Expert Spot the Difference: Level 20<\/h1>/],
  ];
  const descriptions = new Set<string>();
  for (const [url, title, h1] of expectations) {
    const html = await (await request.get(url)).text();
    expect(html, url).toMatch(title);
    expect(html, url).toMatch(h1);
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "";
    expect(description.length, `${url} description`).toBeGreaterThan(url.startsWith("/zh") ? 40 : 100);
    descriptions.add(description);
    expect(html, url).not.toMatch(/命|条命/);
  }
  expect(descriptions.size, "unique descriptions").toBe(expectations.length);
});
