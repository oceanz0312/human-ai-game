import { expect, test } from "@playwright/test";
import { assertOneScreen } from "./helpers";

export const CONTENT_PATHS = [
  "/",
  "/spot-the-difference",
  "/find-the-difference",
  "/human-vs-ai",
  "/games",
  "/how-to-play",
  "/faq",
  "/about",
  "/privacy",
  "/terms",
  "/ai-opponents",
  "/ai-opponents/luna",
  "/games/spot-the-difference/play",
];

test.describe("@layout content pages fit one screen", () => {
  for (const path of CONTENT_PATHS) {
    for (const prefix of ["", "/zh"]) {
      const url = prefix && path === "/" ? prefix : `${prefix}${path}`;
      test(`${url} fits`, async ({ page }) => {
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await assertOneScreen(page);
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
