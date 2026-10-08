import { expect, test } from "@playwright/test";
import { answer, next, startGame } from "./helpers";

test("a finished run generates a poster and a shareable landing page", async ({ page, browser }) => {
  await startGame(page);
  for (let n = 1; n <= 3; n += 1) {
    await answer(page, n, "wrong");
    await next(page);
  }
  await page.waitForURL(/\/result\//);
  const publicId = page.url().split("/result/")[1];

  await page.getByRole("button", { name: "生成战绩海报" }).click();
  const poster = page.getByRole("dialog", { name: "战绩海报" }).locator("img");
  await expect(poster).toBeVisible();
  const size = await poster.evaluate((img: HTMLImageElement) => ({ width: img.naturalWidth, height: img.naturalHeight }));
  expect(size).toEqual({ width: 1080, height: 1920 });
  const png = await poster.evaluate(async (img: HTMLImageElement) => {
    const blob = await (await fetch(img.src)).blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("test-results/screens", { recursive: true });
  writeFileSync("test-results/screens/poster.png", Buffer.from(png, "base64"));
  await expect(page.getByRole("button", { name: "复制链接" })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();

  const friend = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const friendPage = await friend.newPage();
  await friendPage.goto(`/share/${publicId}`);
  await expect(friendPage.getByTestId("reached-level")).toHaveText("03");
  await expect(friendPage.getByText("同样的 20 关，你能走到哪里？")).toBeVisible();
  await friendPage.goto(`/result/${publicId}`);
  await friendPage.waitForURL(/\/share\//);
  await friendPage.getByRole("button", { name: "开始挑战" }).click();
  await friendPage.waitForURL(/\/play\//);
  await friend.close();

  const og = await page.request.get(`/share/${publicId}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("tampered result ids are rejected", async ({ page }) => {
  const response = await page.goto("/share/not-a-real-result-id");
  expect(response?.status()).toBe(404);
  const api = await page.request.get("/api/results/AAAAAAAAAAAAAAAAAAAAAA");
  expect(api.status()).toBe(404);
});

test("nicknames can be set from the result page leaderboard", async ({ page }) => {
  await startGame(page);
  for (let n = 1; n <= 3; n += 1) {
    await answer(page, n, "wrong");
    await next(page);
  }
  await page.waitForURL(/\/result\//);
  await page.getByPlaceholder("昵称（可选）").fill("测试玩家");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("昵称已更新")).toBeVisible();
  await expect(page.locator(".board-rows .me")).toContainText("测试玩家");
});
