import { expect, test, type Page } from "@playwright/test";
import { HOME_START } from "./t";
import { themeCards } from "../../src/content/keyword-pages";
import { parseSkinDate, skinForDay } from "../../src/config/skin-calendar";
import { E2E_SKIN_DATE } from "./skin-date";

const d = parseSkinDate(E2E_SKIN_DATE)!;
const E2E_SKIN = skinForDay(d.year, d.month, d.day);

type Beacon = { name: string; metadata?: Record<string, unknown> };

/** Record analytics beacons in sessionStorage (survives same-origin navigation); the real beacon still goes out. */
async function recordAnalytics(page: Page) {
  await page.addInitScript(() => {
    const original = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      if (String(url).endsWith("/api/analytics") && data instanceof Blob) {
        void data.text().then((text) => {
          const list = JSON.parse(sessionStorage.getItem("__beacons") ?? "[]") as unknown[];
          list.push(JSON.parse(text));
          sessionStorage.setItem("__beacons", JSON.stringify(list));
        });
      }
      return original(url, data);
    };
  });
  return () => page.evaluate(() => JSON.parse(sessionStorage.getItem("__beacons") ?? "[]") as Beacon[]);
}

test.describe("@viewport home hero v2", () => {
  test("demo plays on the real board, then play starts in place (timer runs, no navigation)", async ({ page }) => {
    const events = await recordAnalytics(page);
    await page.goto("/");
    const board = page.getByTestId("quick-board");
    await expect(board).toHaveAttribute("data-phase", "demo");
    await expect(page.getByTestId("quick-demo")).toBeVisible();
    // Exactly one primary CTA on the page, and no button on the board besides its cells.
    await expect(page.locator(".primary-action")).toHaveCount(1);
    await expect(board.getByRole("button")).toHaveCount(16);
    // Sequence: decoy highlight(s) and then the odd cell.
    await expect(board.locator('.quick-cell[data-state="scan"]')).toHaveCount(1, { timeout: 3_000 });
    await expect(board.locator('.quick-cell[data-state="odd"]')).toHaveCount(1, { timeout: 4_000 });
    await expect(board).toHaveAttribute("data-phase", "playing", { timeout: 4_000 });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("quick-demo")).toHaveCount(0);
    await expect(page.locator(".quick-clock")).not.toHaveText("20.0s", { timeout: 2_000 });
    await expect.poll(async () => (await events()).map((e) => e.name)).toEqual(expect.arrayContaining(["demo_view", "board_start"]));
    expect((await events()).find((e) => e.name === "board_start")?.metadata).toMatchObject({ page: "/", trigger: "demo_end" });
    // The board is a real round: answer it.
    await board.getByTestId("quick-cell").nth(5).click();
    await expect(page.getByTestId("quick-result")).toHaveText(/You win!|AI wins|No winner/);
  });

  test("tapping the board during the demo skips it and starts play", async ({ page }) => {
    const events = await recordAnalytics(page);
    await page.goto("/");
    const board = page.getByTestId("quick-board");
    await expect(board.locator('.quick-cell[data-state="scan"]')).toHaveCount(1, { timeout: 3_000 });
    await board.getByTestId("quick-cell").nth(2).click();
    await expect(board).toHaveAttribute("data-phase", "playing");
    await expect.poll(async () => (await events()).map((e) => e.name)).toEqual(expect.arrayContaining(["demo_skip", "board_start"]));
    expect((await events()).find((e) => e.name === "board_start")?.metadata).toMatchObject({ trigger: "tap" });
  });

  test("reduced motion: no demo animation, tap a cell to start", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const board = page.getByTestId("quick-board");
    await page.waitForTimeout(3_800);
    await expect(board).toHaveAttribute("data-phase", "demo");
    await expect(board.locator(".quick-cell[data-state]")).toHaveCount(0);
    await board.getByTestId("quick-cell").first().click();
    await expect(board).toHaveAttribute("data-phase", "playing");
  });

  test("the primary CTA starts the 20-level run directly (no opponent select)", async ({ page }) => {
    const events = await recordAnalytics(page);
    await page.goto("/");
    const cta = page.getByRole("button", { name: HOME_START });
    await expect(cta).toContainText("20 levels · vs AI");
    const box = (await cta.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await cta.click();
    await page.waitForURL(/\/play\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("opponent-select")).toHaveCount(0);
    expect((await events()).find((e) => e.name === "hero_cta_click")?.metadata).toMatchObject({ page: "/", placement: "hero" });
  });

  test("below the first screen: keyword-anchored link and five theme cards; header has a Levels text link", async ({ page }) => {
    await page.goto("/");
    const more = page.getByTestId("kw-more").getByRole("link", { name: "spot the difference game", exact: true });
    await expect(more).toHaveAttribute("href", "/spot-the-difference-game");
    // Five evergreen cards, plus the seasonal card first while its skin is on (picked per request by NY date).
    await expect(page.getByTestId("kw-themes").getByRole("link")).toHaveCount(themeCards(E2E_SKIN).length);
    for (const href of ["/easy", "/hard", "/for-kids", "/christmas", "/pictures"]) await expect(page.locator(`.kw-themes a[href="${href}"]`)).toHaveCount(1);
    await expect(page.locator(".site-header .nav-cta")).toHaveCount(0);
    await expect(page.locator(".site-header a.nav-levels")).toHaveAttribute("href", "/spot-the-difference-game");
    await expect(page.locator("body")).not.toContainText(/命|条/);
  });
});
