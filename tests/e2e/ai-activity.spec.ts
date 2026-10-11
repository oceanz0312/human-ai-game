import { expect, test } from "@playwright/test";
import { cellName, level, startGame, waitForPlayable } from "./helpers";

test("live AI activity steps appear during play and on reveal", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);

  const activity = page.getByTestId("ai-activity");
  await expect(activity).toBeVisible();
  await expect(activity.getByTestId("ai-activity-step").filter({ hasText: "决策凭证已签发" })).toBeVisible({ timeout: 15_000 });
  await expect(activity.getByTestId("ai-activity-step").filter({ hasText: /请求已发送|等待 Worker/ }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(activity.locator(".ai-activity-time.num").first()).toBeVisible();

  await expect(activity.getByTestId("ai-activity-step").filter({ hasText: /Worker 已响应/ })).toBeVisible({ timeout: 15_000 });

  const choice = level(1).correctChoice;
  await page.getByRole("button", { name: cellName(choice) }).tap();
  await expect(page.getByText("答案揭晓")).toBeVisible();

  await expect(page.getByTestId("ai-activity")).toBeVisible();
  await expect(page.getByTestId("ai-activity-step").filter({ hasText: /Worker 已响应/ })).toBeVisible();
  await expect(page.locator(".reveal-activity .ai-activity-time.num").first()).toBeVisible();
});
