import { expect, test } from "@playwright/test";
import { games, liveGames, plannedGames } from "../../src/games/registry";
import { assertNoForbiddenWords, assertNoHorizontalOverflow } from "./helpers";

const jsonLdTypes = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) =>
    ([] as { "@type": string | string[] }[]).concat(JSON.parse(match[1])).map((block) => ([] as string[]).concat(block["@type"]).join("+")),
  );

test.describe("@viewport platform hub", () => {
  for (const prefix of ["", "/zh"]) {
    test(`${prefix || "/"} lists every registry game and its links resolve`, async ({ page, request }) => {
      const response = await page.goto(prefix || "/");
      expect(response?.status()).toBe(200);
      const list = page.getByTestId("game-list");
      await expect(list.getByTestId("game-card")).toHaveCount(liveGames().length);
      await expect(list.getByTestId("planned-card")).toHaveCount(plannedGames.length + 1);
      for (const game of liveGames()) {
        const card = list.locator(`[data-slug="${game.slug}"]`);
        await expect(card).toBeVisible();
        const hrefs = await card.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
        expect(hrefs).toContain(`${prefix}${game.landingPath}`);
        for (const href of new Set(hrefs)) expect((await request.get(href)).status(), href).toBe(200);
      }
      // placeholders never link anywhere
      await expect(list.getByTestId("planned-card").locator("a")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await assertNoHorizontalOverflow(page);
      await assertNoForbiddenWords(page);
      await expect(page.locator("body")).not.toContainText(/20 关|20 levels/);
    });
  }

  test("home is the hub, not the game page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Human vs AI Games/);
    await expect(page.locator(".game-stage")).toHaveCount(0);
    await page.getByTestId("hub-play").click();
    await page.waitForURL(/\/spot-the-difference$/);
    await expect(page).toHaveTitle(/Spot the Difference.*Find the Difference/);
    await expect(page.getByTestId("home-race")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });
});

test("hub + landing structured data and breadcrumbs", async ({ request }) => {
  const home = await (await request.get("/")).text();
  expect(jsonLdTypes(home)).toEqual(expect.arrayContaining(["WebSite", "Organization", "ItemList"]));
  expect(jsonLdTypes(home)).not.toContain("VideoGame+WebApplication");
  const landing = await (await request.get("/spot-the-difference")).text();
  expect(jsonLdTypes(landing)).toEqual(expect.arrayContaining(["BreadcrumbList", "VideoGame+WebApplication"]));
  const crumbs = [...landing.matchAll(/"@type":"ListItem","position":\d+,"name":"([^"]+)"/g)].map((match) => match[1]);
  expect(crumbs).toEqual(["Home", "All games", "Spot the Difference"]);
});

test("sitemap lists every live game landing in both languages, and no placeholders", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const game of games.filter((entry) => entry.status === "live")) {
    expect(xml).toMatch(new RegExp(`<loc>[^<]+${game.landingPath}</loc>`));
    expect(xml).toMatch(new RegExp(`<loc>[^<]+/zh${game.landingPath}</loc>`));
  }
  for (const planned of plannedGames) expect(xml).not.toContain(planned.slug);
});
