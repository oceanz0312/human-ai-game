import { expect, test } from "@playwright/test";
import { pickOpponent } from "./helpers";

test("English is served at the root without a prefix", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});

test("Chinese is served under /zh", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("button", { name: "开始挑战" })).toBeVisible();
});

test("/en and trailing slashes redirect permanently", async ({ request }) => {
  for (const [from, to] of [["/en", "/"], ["/en/faq", "/faq"], ["/zh/", "/zh"]]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(new URL(response.headers()["location"], "http://x").pathname, from).toBe(to);
  }
});

test("unknown paths are 404 in both locales", async ({ request }) => {
  expect((await request.get("/definitely-missing")).status()).toBe(404);
  expect((await request.get("/zh/definitely-missing")).status()).toBe(404);
});

test("the chosen locale carries over to the session pages", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "开始挑战" }).click();
  await pickOpponent(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});

test("the English game flow is fully localized", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await pickOpponent(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Row 1, column 1" })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator(".game-hint")).toContainText("Tap the odd one");
  await page.getByRole("button", { name: "Row 1, column 1" }).click();
  await expect(page.getByTestId("reveal-next")).toHaveText(/Next level|See results/);
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\p{Script=Han}/u);
});
