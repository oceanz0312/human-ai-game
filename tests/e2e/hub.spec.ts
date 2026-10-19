import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow } from "./helpers";
import { START } from "./t";

const KEYWORD_PAGES = ["/", "/spot-the-difference-game", "/find-the-difference", "/easy", "/hard", "/for-kids", "/christmas", "/halloween", "/thanksgiving", "/winter", "/pictures", "/printable", "/how-to-play", "/human-vs-ai", "/faq", "/about", "/privacy", "/terms"];

const HOLIDAY_TITLES_WITHOUT_BRAND = ["/halloween", "/thanksgiving", "/winter"];

const jsonLd = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => ([] as Record<string, unknown>[]).concat(JSON.parse(match[1])));

test.describe("hidden platform hub (/games)", () => {
  test("direct URL works but bots are told noindex,nofollow (meta + X-Robots-Tag)", async ({ page, request }) => {
    const response = await request.get("/games");
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const html = await response.text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    await page.goto("/games");
    await expect(page.getByTestId("game-list")).toBeVisible();
    // Game pages below the hub stay indexable (no header, no Disallow).
    const level = await request.get("/games/spot-the-difference/levels/3");
    expect(level.status()).toBe(200);
    expect(level.headers()["x-robots-tag"]).toBeUndefined();
  });

  test("robots.txt disallows only /games$ and the sitemap never lists it", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/^Disallow: \/games\$$/m);
    expect(robots).not.toMatch(/^Disallow: \/games\/?$/m);
    expect(robots).toContain("Sitemap: https://spotthedifferencegame.com/sitemap.xml");
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toMatch(/<loc>[^<]*\/games<\/loc>/);
    expect(xml).not.toContain("/zh");
    for (const path of ["", "/printable", "/christmas", "/halloween", "/thanksgiving", "/winter", "/find-the-difference", "/spot-the-difference-game"]) expect(xml).toContain(`<loc>https://spotthedifferencegame.com${path}</loc>`);
  });

  test("no crawlable internal link points to the hub from any public page", async ({ request }) => {
    for (const path of KEYWORD_PAGES) {
      const html = await (await request.get(path)).text();
      expect(html, path).not.toMatch(/href="\/games\/?"/);
      expect(html, path).not.toMatch(/href="https:\/\/spotthedifferencegame\.com\/games\/?"/);
    }
  });
});

test.describe("@viewport keyword pages", () => {
  test("home: H1 'Spot the Difference' and a playable board inside the first screen", async ({ page }) => {
    // Reduced motion: no auto-starting demo, so the first tap deterministically starts the match.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page).toHaveTitle("Spot the Difference – Play Free Online | Spot The Difference Game");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spot the Difference");
    const board = page.getByTestId("quick-board");
    const box = (await board.locator(".quick-stage").boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y + box.height, "board fits the first screen").toBeLessThanOrEqual(viewport.height + 1);
    // Hero v2: no Play button on the board; the first tap on a cell starts the match in place.
    await expect(page.getByTestId("quick-start")).toHaveCount(0);
    await page.getByTestId("quick-cell").first().click();
    await expect(board).toHaveAttribute("data-phase", "playing");
    await expect(page).toHaveURL(/\/$/);
    await page.getByTestId("quick-cell").first().click();
    await expect(page.getByTestId("quick-result")).toHaveText(/You win!|AI wins|No winner/);
    await page.getByTestId("quick-next").click();
    await expect(page.getByTestId("quick-cell")).toHaveCount(25);
    await assertNoHorizontalOverflow(page);
  });

  test("every keyword page has a unique title, H1, description and self canonical", async ({ request }) => {
    const seen = { title: new Set<string>(), h1: new Set<string>(), description: new Set<string>() };
    for (const path of KEYWORD_PAGES) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      const title = html.match(/<title>([^<]+)<\/title>/)![1];
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1];
      const description = html.match(/<meta name="description" content="([^"]+)"/)![1];
      for (const [key, value] of Object.entries({ title, h1, description }) as [keyof typeof seen, string][]) {
        expect(seen[key].has(value), `${path} duplicate ${key}`).toBe(false);
        seen[key].add(value);
      }
      // Holiday pages carry 哥飞's reviewed short titles (no brand suffix) — copy review 2026-10-19.
      if (!HOLIDAY_TITLES_WITHOUT_BRAND.includes(path)) expect(title, path).toMatch(/Spot The Difference Game/);
      expect(html, path).toContain(`<link rel="canonical" href="https://spotthedifferencegame.com${path === "/" ? "" : path}"/>`);
      expect(html, path).not.toMatch(/hreflang="zh/);
    }
  });

  test("JSON-LD: VideoGame + FAQPage with the AI question on home", async ({ request }) => {
    const blocks = jsonLd(await (await request.get("/")).text());
    const types = blocks.map((block) => block["@type"]);
    expect(types).toEqual(expect.arrayContaining(["VideoGame", "FAQPage", "WebSite", "Organization"]));
    const faq = blocks.find((block) => block["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
    expect(faq.mainEntity.map((q) => q.name)).toContain("Can I play spot the difference against AI?");
  });

  test("printable page has real print sheets with answer keys", async ({ page }) => {
    await page.goto("/printable");
    await expect(page.getByTestId("print-sheet")).toHaveCount(6);
    await expect(page.getByTestId("answer-key")).toHaveCount(6);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.getByTestId("print-sheet").first()).toBeVisible();
  });

  test("ad slots are static placeholders: hidden, no ad script, no publisher id", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("ad-slot")).toHaveCount(2);
    for (const slot of await page.getByTestId("ad-slot").all()) await expect(slot).toBeHidden();
    const html = await page.content();
    expect(html).not.toMatch(/adsbygoogle|pagead2|ca-pub-/);
  });

  test("the 20-level run starts from the keyword pages", async ({ page }) => {
    await page.goto("/spot-the-difference-game");
    await expect(page.getByRole("button", { name: START })).toBeVisible();
  });
});

test("@viewport header controls stay fully on-screen (long brand wraps on small phones)", async ({ page }) => {
  await page.goto("/");
  const width = page.viewportSize()!.width;
  for (const selector of [".nav-menu > summary", ".site-header .nav-levels"]) {
    const el = page.locator(selector);
    if (!(await el.isVisible())) continue;
    const box = (await el.boundingBox())!;
    expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
  }
  const logo = page.locator(".site-logo");
  expect(await logo.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});
