import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, CONTENT_PATHS } from "./helpers";


test.describe("@layout content pages: first screen + no sideways scroll", () => {
  for (const path of CONTENT_PATHS) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await assertNoHorizontalOverflow(page);
    });
  }
});


test("registry-driven game templates: unknown or not-live games are 404", async ({ request }) => {
  for (const path of ["/games/not-a-game/leaderboard", "/games/memory-match/play", "/games/not-a-game/levels/1", "/games/spot-the-difference/levels/99"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get("/games/spot-the-difference/levels/7")).status()).toBe(200);
});
