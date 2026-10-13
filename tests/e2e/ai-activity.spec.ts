import { expect, test } from "@playwright/test";
import { answer, startGame, waitForPlayable } from "./helpers";

test("live AI activity appears as danmaku during play and full steps in reveal sheet", async ({ page }) => {
  await startGame(page);
  await waitForPlayable(page, 1);
  await expect(page.getByTestId("ai-danmaku")).toBeVisible();

  await answer(page, 1, "correct");

  const danmaku = page.getByTestId("ai-danmaku");
  await expect(danmaku).toContainText("决策凭证已签发");
  await expect(danmaku).toContainText(/Worker 已响应|等待 Worker/);

  await page.getByRole("button", { name: "AI 详情" }).click();
  await expect(page.getByTestId("ai-activity")).toBeVisible();
  await expect(page.getByTestId("ai-activity-step").filter({ hasText: /Worker 已响应/ })).toBeVisible();
  await expect(page.locator(".ai-activity-time.num").first()).toBeVisible();
});
