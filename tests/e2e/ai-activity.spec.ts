import { expect, test } from "@playwright/test";
import { cellName, level, startGame, waitForPlayable } from "./helpers";

test("live AI activity appears as danmaku during play and full steps in reveal sheet", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);

  const danmaku = page.getByTestId("ai-danmaku");
  await expect(danmaku).toBeVisible();
  await expect(danmaku).toContainText("决策凭证已签发", { timeout: 15_000 });
  await expect(danmaku).toContainText(/请求已发送|等待 Worker/, { timeout: 15_000 });
  await expect(danmaku).toContainText(/Worker 已响应/, { timeout: 15_000 });

  await page.getByRole("button", { name: "AI 详情" }).click();
  const activity = page.getByTestId("ai-activity");
  await expect(activity).toBeVisible();
  await expect(activity.getByTestId("ai-activity-step").filter({ hasText: "决策凭证已签发" })).toBeVisible();
  await expect(activity.locator(".ai-activity-time.num").first()).toBeVisible();

  const choice = level(1).correctChoice;
  await page.getByRole("button", { name: cellName(choice) }).tap();
  await expect(page.getByText("答案揭晓")).toBeVisible();

  await page.getByRole("button", { name: "AI 详情" }).click();
  await expect(page.getByTestId("ai-activity")).toBeVisible();
  await expect(page.getByTestId("ai-activity-step").filter({ hasText: /Worker 已响应/ })).toBeVisible();
});
