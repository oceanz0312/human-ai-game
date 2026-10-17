import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, CONTENT_PATHS } from "./helpers";


test.describe("@layout content pages: first screen + no sideways scroll", () => {
  for (const path of CONTENT_PATHS) {
    for (const prefix of ["", "/zh"]) {
      const url = prefix && path === "/" ? prefix : `${prefix}${path}`;
      test(`${url} renders`, async ({ page }) => {
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await assertNoHorizontalOverflow(page);
      });
    }
  }
});

test("game base path 308s to the keyword landing page", async ({ request }) => {
  for (const [from, to] of [["/games/spot-the-difference", "/spot-the-difference"], ["/zh/games/spot-the-difference", "/zh/spot-the-difference"]]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(new URL(response.headers()["location"], "http://x").pathname).toBe(to);
  }
});

test("unknown AI opponent is a 404", async ({ request }) => {
  expect((await request.get("/ai-opponents/not-a-model")).status()).toBe(404);
});

test("registry-driven game templates: unknown or not-live games are 404", async ({ request }) => {
  for (const path of ["/games/not-a-game/leaderboard", "/games/memory-match/play", "/zh/games/not-a-game/levels/1", "/games/spot-the-difference/levels/99"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get("/games/spot-the-difference/levels/7")).status()).toBe(200);
});
