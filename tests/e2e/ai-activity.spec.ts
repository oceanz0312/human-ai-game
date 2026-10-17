import { expect, test } from "@playwright/test";
import { answer, next, startGame, waitForPlayable } from "./helpers";

test("the AI starts at first paint and streams humanized real events; the answer stays sealed until lock-in", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  const terminal = page.getByTestId("ai-terminal");
  await expect(terminal).toContainText("AI 看到了图片");
  // The fake AI answers in ~1s, before this test taps: the play UI says so but shows no cell or time.
  await expect(page.getByTestId("ai-status")).toHaveText("AI 已作答 🔒", { timeout: 10_000 });
  await expect(terminal).toContainText("AI 已作答 · 答案已封存");
  await expect(terminal).not.toContainText(/Worker|凭证|已接受|\d\.\d\ds/);
  await expect(page.getByTestId("ai-danmaku")).toBeVisible();

  await answer(page, 1, "correct");
  const danmaku = page.getByTestId("ai-danmaku");
  await expect(danmaku.locator(".ai-danmaku-item")).toHaveCount(2, { timeout: 10_000 });
  await expect(danmaku).not.toContainText(/AI 最看好|置信度/);
  await expect(page.getByTestId("ai-timeline")).toContainText(/AI 给出答案 · \d\.\d\ds · (答对|看错了)/);

  await page.getByRole("button", { name: "AI 详情" }).click();
  await expect(page.getByTestId("ai-activity")).toBeVisible();
  await expect(page.getByTestId("ai-activity-step").filter({ hasText: "AI 看到了图片" })).toBeVisible();
  await expect(page.locator(".ai-activity-time.num").first()).toBeVisible();
  await expect(page.getByRole("dialog").getByTestId("candidate-chip").first()).toBeVisible();
});

test("tapping never waits for the AI: the submit request leaves immediately", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  const submitted = page.waitForRequest((request) => request.url().includes("/submit"));
  const tappedAt = Date.now();
  await page.getByRole("button", { name: "第 1 行第 1 列" }).click();
  await submitted;
  expect(Date.now() - tappedAt).toBeLessThan(500);
});

test("a quick tap keeps the board with a real AI counter, then reveals once the AI really answers", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await page.getByRole("button", { name: "第 1 行第 1 列" }).click();
  const waiting = page.getByTestId("ai-waiting");
  await expect(waiting).toContainText(/你已锁定 · AI (还在分析 \d+\.\d+s|正在分析|在看图)/);
  await expect(page.getByTestId("board")).toBeVisible();
  await expect(page.getByText("答案揭晓")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("ai-timeline")).toContainText(/AI 给出答案 · \d\.\d\ds/);
});

test("the next round is prefetched during the reveal without starting its AI", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  const starts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/rounds\/[^/]+\/start$/.test(request.url())) starts.push(request.url());
  });
  const prefetched = page.waitForRequest((request) => request.method() === "POST" && /\/api\/sessions\/[^/]+\/rounds$/.test(request.url()));
  await answer(page, 1, "correct");
  await prefetched;
  await page.waitForTimeout(400);
  expect(starts).toHaveLength(0);
  await next(page);
  await waitForPlayable(page, 2);
  await expect.poll(() => starts.length).toBe(1);
});
