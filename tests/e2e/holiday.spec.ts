import { expect, test } from "@playwright/test";
import { seasonalCard } from "../../src/content/keyword-pages";

/** Holiday keyword pages (holiday-pages-plan.md): themed board, own copy, linked from footer, printable and the home seasonal card. */
const ld = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat()) as Record<string, unknown>[];

test("/halloween: find-variant title, spot-variant H1, indexable, VideoGame + FAQPage + BreadcrumbList", async ({ request }) => {
  const res = await request.get("/halloween");
  expect(res.status()).toBe(200);
  expect(res.headers()["x-robots-tag"]).toBeUndefined();
  const html = await res.text();
  expect(html).toContain("<title>Halloween Find the Difference – Free Spot the Difference Puzzles | Spot The Difference Game</title>");
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

test("/halloween is linked from the footer, the printable page has a Halloween sheet, Christmas links back", async ({ page }) => {
  await page.goto("/christmas");
  await expect(page.locator('footer a[href="/halloween"]')).toHaveText("Halloween puzzles");
  await expect(page.locator('.info-links a[href="/halloween"]')).toHaveCount(1);
  await page.goto("/printable");
  await expect(page.getByRole("heading", { name: "Sheet 3 · Halloween" })).toBeVisible();
});

test("home seasonal card follows the date window", async ({ page }) => {
  await page.goto("/");
  const card = page.locator('.kw-themes a[href="/halloween"]');
  // Pages are prerendered at build time: assert against the build day's window (same UTC day in CI).
  await expect(card).toHaveCount(seasonalCard()?.href === "/halloween" ? 1 : 0);
});
