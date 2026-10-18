import { expect, test } from "@playwright/test";
import { pickOpponent } from "./helpers";
import { HOME_START, START } from "./t";

test("English is served at the root without a prefix", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: HOME_START })).toBeVisible();
});

test("English only: /zh, /en and retired URLs redirect permanently to their English page", async ({ request }) => {
  const cases: [string, string][] = [
    ["/zh", "/"],
    ["/zh/faq", "/faq"],
    ["/zh/how-to-play", "/how-to-play"],
    ["/zh/spot-the-difference", "/"],
    ["/zh/games/spot-the-difference/levels/3", "/games/spot-the-difference/levels/3"],
    ["/zh/ai-opponents/luna", "/human-vs-ai"],
    ["/en", "/"],
    ["/en/faq", "/faq"],
    ["/spot-the-difference", "/"],
    ["/games/spot-the-difference", "/"],
    ["/ai-opponents", "/human-vs-ai"],
    ["/ai-opponents/luna", "/human-vs-ai"],
  ];
  for (const [from, to] of cases) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect([301, 308], from).toContain(response.status());
    expect(new URL(response.headers()["location"], "http://x").pathname, from).toBe(to);
  }
  // Following the chain always ends on a 200 English page.
  for (const from of [...cases.map(([path]) => path), "/zh/"]) expect((await request.get(from)).status(), from).toBe(200);
});

test("unknown paths are 404", async ({ request }) => {
  expect((await request.get("/definitely-missing")).status()).toBe(404);
});

test("session pages are English even with an old zh cookie", async ({ page }) => {
  await page.context().addCookies([{ name: "hv_locale", value: "zh", url: "http://127.0.0.1:3100" }]);
  await page.goto("/spot-the-difference-game");
  await page.getByRole("button", { name: START }).click();
  await pickOpponent(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Row 1, column 1" })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator(".game-hint")).toContainText("Tap the odd one");
  await page.getByRole("button", { name: "Row 1, column 1" }).click();
  await expect(page.getByTestId("reveal-next")).toHaveText(/Next level|See results/);
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\p{Script=Han}/u);
});
