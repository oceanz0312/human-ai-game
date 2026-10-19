import { expect, test } from "@playwright/test";

/** Holiday keyword pages (holiday-pages-plan.md): themed board, own copy, linked from footer, printable and the home seasonal card. */
const ld = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat()) as Record<string, unknown>[];

test("/halloween: 哥飞-reviewed title/H1 (both \"Spot\"), indexable, VideoGame + FAQPage + BreadcrumbList", async ({ request }) => {
  const res = await request.get("/halloween");
  expect(res.status()).toBe(200);
  expect(res.headers()["x-robots-tag"]).toBeUndefined();
  const html = await res.text();
  expect(html).toMatch(/<title>Halloween Spot the Difference – Free Puzzle vs AI( \| Spot The Difference Game)?<\/title>/);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "");
  expect(visible.match(/Halloween find the difference/gi), "find variant once, naturally").toHaveLength(1);
  expect(html).toMatch(/<h1[^>]*>Halloween Spot the Difference<\/h1>/);
  expect(html).not.toMatch(/<meta name="robots" content="noindex/);
  const types = ld(html).map((d) => [d["@type"]].flat().join("+"));
  expect(types).toEqual(expect.arrayContaining(["VideoGame", "FAQPage", "BreadcrumbList"]));
  const faq = ld(html).find((d) => d["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
  expect(faq.mainEntity.map((q) => q.name)).toContain("Can I race the AI on Halloween spot the difference?");
  // Honest copy: simulated opponent named, no superlatives, American spelling.
  expect(html).toContain("simulated opponent");
  expect(html).not.toMatch(/\b(best|#1|colour|favourite)\b/i);
});

test("/halloween: a full 3-puzzle match on Halloween sprites, no auto-advance between puzzles", async ({ page }) => {
  await page.goto("/halloween");
  const board = page.getByTestId("quick-board");
  await expect(board.locator("symbol").first()).toHaveAttribute("id", /-(pumpkin|ghost|bat|witch-hat|black-cat|candy-corn|spider|cauldron)(-odd)?$/);
  await page.getByTestId("quick-start").click();
  for (let round = 0; round < 3; round++) {
    await expect(board).toHaveAttribute("data-phase", "playing");
    await board.locator('.quick-cell:has(use[href$="-odd"])').click();
    await expect(page.getByTestId("quick-result")).toHaveText(/You win!|AI wins|No winner/);
    // The next puzzle waits for the player.
    await page.waitForTimeout(600);
    await expect(board).toHaveAttribute("data-phase", "reveal");
    await page.getByTestId("quick-next").click();
  }
  await expect(page.getByTestId("quick-done")).toBeVisible();
});

test("/halloween is linked from the footer, links /printable exactly once, and the printable page has a Halloween sheet", async ({ page }) => {
  await page.goto("/halloween");
  await expect(page.locator('footer a[href="/halloween"]')).toHaveText("Halloween puzzles");
  const printable = page.locator('.kw-page a[href="/printable"]');
  await expect(printable).toHaveCount(1);
  await expect(printable).toHaveText(/^Halloween printable spot the difference/);
  await page.goto("/printable");
  await expect(page.getByRole("heading", { name: "Sheet 3 · Halloween" })).toBeVisible();
});

test("/thanksgiving: 哥飞-reviewed title/H1, indexable, find variant once, one /printable link, full match", async ({ page, request }) => {
  const res = await request.get("/thanksgiving");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toMatch(/<title>Thanksgiving Spot the Difference – Free Puzzle vs AI<\/title>/);
  expect(html).toMatch(/<h1[^>]*>Thanksgiving Spot the Difference<\/h1>/);
  expect(html).not.toMatch(/<meta name="robots" content="noindex/);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "");
  expect(visible.match(/Thanksgiving find the difference/gi)).toHaveLength(1);
  expect(visible).toContain("simulated opponent");
  expect(visible).not.toMatch(/\b(best|#1|colour|favourite)\b/i);
  const types = ld(html).map((d) => [d["@type"]].flat().join("+"));
  expect(types).toEqual(expect.arrayContaining(["VideoGame", "FAQPage", "BreadcrumbList"]));

  await page.goto("/thanksgiving");
  await expect(page.locator('footer a[href="/thanksgiving"]')).toHaveText("Thanksgiving puzzles");
  await expect(page.locator('.kw-page a[href="/printable"]')).toHaveText(/^Thanksgiving printable spot the difference/);
  const board = page.getByTestId("quick-board");
  await expect(board.locator("symbol").first()).toHaveAttribute("id", /-(turkey|pumpkin-pie|corn|acorn|maple-leaf|football|cornucopia|gourd)(-odd)?$/);
  await page.getByTestId("quick-start").click();
  for (let round = 0; round < 3; round++) {
    await expect(board).toHaveAttribute("data-phase", "playing");
    await board.locator('.quick-cell:has(use[href$="-odd"])').click();
    await expect(page.getByTestId("quick-result")).toHaveText(/You win!|AI wins|No winner/);
    await page.getByTestId("quick-next").click();
  }
  await expect(page.getByTestId("quick-done")).toBeVisible();
  await page.goto("/printable");
  await expect(page.getByRole("heading", { name: "Sheet 4 · Thanksgiving" })).toBeVisible();
});
