import { expect, test } from "@playwright/test";

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
  await page.waitForURL(/\/play\//);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});
