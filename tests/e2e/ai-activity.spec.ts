import { expect, test } from "@playwright/test";
import { answer, next, startGame, waitForPlayable } from "./helpers";
import { rx, t } from "./t";

test("the AI starts at first paint and streams humanized real events; the answer stays sealed until lock-in", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  const terminal = page.getByTestId("ai-terminal");
  await expect(terminal).toContainText(t("AI 看到了图片"));
  // The fake AI answers in ~1s, before this test taps: the play UI says so but shows no cell or time.
  await expect(page.getByTestId("ai-status")).toHaveText(t("AI 已作答 🔒"), { timeout: 10_000 });
  await expect(terminal).toContainText(t("AI 已作答 · 答案已封存"));
  await expect(terminal).not.toContainText(/Worker|ticket|accepted|\d\.\d\ds/i);
  await expect(page.getByTestId("ai-danmaku")).toBeVisible();

  await answer(page, 1, "correct");
  const danmaku = page.getByTestId("ai-danmaku");
  await expect(danmaku.locator(".ai-danmaku-item")).toHaveCount(2, { timeout: 10_000 });
  await expect(danmaku).not.toContainText(new RegExp(`${rx("AI 最看好")}|${rx("置信度")}`));
  await expect(page.getByTestId("ai-timeline")).toContainText(new RegExp(`${rx("AI 给出答案")} · \\d\\.\\d\\ds · (${rx("答对")}|${rx("看错了")})`));

  await page.getByRole("button", { name: t("AI 详情") }).click();
  await expect(page.getByTestId("ai-activity")).toBeVisible();
  await expect(page.getByTestId("ai-activity-step").filter({ hasText: t("AI 看到了图片") })).toBeVisible();
  await expect(page.locator(".ai-activity-time.num").first()).toBeVisible();
  await expect(page.getByRole("dialog").getByTestId("candidate-chip").first()).toBeVisible();
});

test("tapping never waits for the AI: the submit request leaves immediately", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  const submitted = page.waitForRequest((request) => request.url().includes("/submit"));
  const tappedAt = Date.now();
  await page.getByRole("button", { name: "Row 1, column 1" }).click();
  await submitted;
  expect(Date.now() - tappedAt).toBeLessThan(500);
});

test("a quick tap keeps the board with a real AI counter, then reveals once the AI really answers", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await page.getByRole("button", { name: "Row 1, column 1" }).click();
  const waiting = page.getByTestId("ai-waiting");
  await expect(waiting).toContainText(new RegExp(`${rx("你已锁定")} · (${rx("AI 还在分析 {s}", { s: "XX" }).replace("XX", "\\d+\\.\\d+s")}|${rx("AI 正在分析")}|${rx("AI 在看图")})`));
  await expect(page.getByTestId("board")).toBeVisible();
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("ai-timeline")).toContainText(new RegExp(`${rx("AI 给出答案")} · \\d\\.\\d\\ds`));
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
