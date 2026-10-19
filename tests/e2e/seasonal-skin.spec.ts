import { expect, test } from "@playwright/test";
import { E2E_SKIN_DATE } from "./skin-date";

/**
 * Runtime seasonal skin (proposals/seasonal-skin-plan.md). The server runs with SKIN_DATE=E2E_SKIN_DATE (Oct 31 →
 * Halloween) and SKIN_OVERRIDE_ENABLED=1, so ?skinDate= / ?skin= mock other days.
 */
const head = (html: string) => ({
  title: html.match(/<title>[^<]*<\/title>/)?.[0],
  h1: html.match(/<h1[^>]*>[^<]*<\/h1>/)?.[0],
  canonical: html.match(/<link rel="canonical" href="[^"]*"/)?.[0],
  robots: html.match(/<meta name="robots" content="[^"]*"/)?.[0],
  description: html.match(/<meta name="description" content="[^"]*"/)?.[0],
});
const cards = (page: import("@playwright/test").Page) => page.getByTestId("kw-themes").getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")));

test("default day (SKIN_DATE Oct 31): Halloween skin, Halloween card first, accent + mark, cacheable", async ({ page }) => {
  expect(E2E_SKIN_DATE).toBe("2026-10-31");
  const res = await page.goto("/");
  expect(res!.headers()["x-skin"]).toBe("halloween");
  expect(res!.headers()["cache-control"]).not.toContain("no-store");
  expect(res!.headers()["x-robots-tag"]).toBeUndefined();
  await expect(page.locator(".site-page")).toHaveAttribute("data-skin", "halloween");
  await expect(page.getByTestId("skin-mark")).toBeVisible();
  expect(await cards(page)).toEqual(["/halloween", "/easy", "/hard", "/for-kids", "/christmas", "/pictures"]);
  await expect(page.locator(".kw-theme-seasonal")).toHaveAttribute("href", "/halloween");
  await expect(page).toHaveURL(/\/$/);
});

for (const [date, skin, expected] of [
  ["2026-11-26", "thanksgiving", ["/thanksgiving", "/easy", "/hard", "/for-kids", "/christmas", "/pictures"]],
  ["2026-12-24", "christmas", ["/christmas", "/easy", "/hard", "/for-kids", "/pictures"]],
  ["2027-07-15", "summer", ["/easy", "/hard", "/for-kids", "/christmas", "/pictures"]],
  ["2026-12-05", "winter", ["/winter", "/easy", "/hard", "/for-kids", "/christmas", "/pictures"]],
  ["2027-02-14", "valentines", ["/winter", "/easy", "/hard", "/for-kids", "/christmas", "/pictures"]],
] as const) {
  test(`?skinDate=${date} → ${skin} skin, cards ${expected[0]}…`, async ({ page }) => {
    const res = await page.goto(`/?skinDate=${date}`);
    expect(res!.headers()["x-skin"]).toBe(skin);
    await expect(page.locator(".site-page")).toHaveAttribute("data-skin", skin);
    expect(await cards(page)).toEqual(expected);
    // Seasons without a built page (/spring, /summer, /fall) never link to it.
    await expect(page.locator('a[href="/summer"], a[href="/spring"], a[href="/fall"]')).toHaveCount(0);
  });
}

test("title, H1, description, canonical and robots meta are identical for every skin", async ({ request }) => {
  const base = head(await (await request.get("/")).text());
  expect(base.h1).toMatch(/>Spot the Difference<\/h1>$/);
  // Canonical is the bare origin (no path, never a /skin variant).
  expect(base.canonical).toMatch(/^<link rel="canonical" href="https?:\/\/[^/"]+"$/);
  expect(base.robots).toContain("index, follow");
  for (const q of ["?skin=christmas", "?skin=winter", "?skinDate=2026-11-26", "?skinDate=2027-03-23"]) expect(head(await (await request.get(`/${q}`)).text()), q).toEqual(base);
});

test("overrides are private + noindex; /skin/* is not reachable under its own URL", async ({ request }) => {
  const res = await request.get("/?skin=christmas");
  expect(res.headers()["cache-control"]).toBe("private, no-store");
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
  const direct = await request.get("/skin/halloween", { maxRedirects: 0 });
  expect(direct.status()).toBe(301);
  expect(new URL(direct.headers()["location"], "http://x").pathname).toBe("/");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/skin");
});

test("client-side navigation back to / (logo) renders the skinned home", async ({ page }) => {
  await page.goto("/halloween");
  await page.locator(".site-header .site-logo").click();
  await page.waitForURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spot the Difference");
  await expect(page.locator(".site-page")).toHaveAttribute("data-skin", "halloween");
  await expect(page.locator(".kw-theme").first()).toHaveAttribute("href", "/halloween");
});

test("keyword pages stay unskinned; the game page only gets the accent", async ({ page }) => {
  await page.goto("/halloween");
  await expect(page.locator("[data-skin]")).toHaveCount(0);
  await page.goto("/");
  await page.locator(".primary-action").first().click();
  await page.waitForURL(/\/play\/[0-9a-f-]{36}$/);
  await expect(page.locator("body")).toHaveAttribute("data-skin", "halloween");
});
