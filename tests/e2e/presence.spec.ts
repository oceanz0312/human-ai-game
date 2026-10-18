import { expect, test } from "@playwright/test";
import { startGame, waitForPlayable } from "./helpers";
import { cueLatency, installPresenceProbe, readPresence } from "./presence-probe";
import { t } from "./t";

test("AI presence: 'AI got the picture' within 300 ms of the board, then a scan caption, then the server's answer", async ({ page }) => {
  await installPresenceProbe(page);
  const startBodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().method() === "POST" && /\/api\/rounds\/[^/]+\/start$/.test(response.url())) startBodies.push(response.text().catch(() => ""));
  });
  await startGame(page);
  await waitForPlayable(page, 1);
  await expect(page.getByTestId("ai-status")).toHaveText(t("AI 已作答 🔒"), { timeout: 10_000 });
  const probe = await readPresence(page);
  const gotPicture = cueLatency(probe, t("AI 看到了图片"));
  test.info().annotations.push({ type: "got-picture-ms", description: String(Math.round(gotPicture ?? -1)) });
  console.log(`[presence] got-picture-ms=${Math.round(gotPicture ?? -1)}`);
  expect(gotPicture, JSON.stringify(probe)).not.toBeNull();
  expect(gotPicture!).toBeLessThanOrEqual(300);
  const texts = probe.statuses.map((s) => s.text);
  const iGot = texts.indexOf(t("AI 看到了图片"));
  const iScan = texts.findIndex((text) => text === t("AI 正在扫描画面…") || text === t("AI 正在比对每一格…"));
  const iAnswered = texts.indexOf(t("AI 已作答 🔒"));
  expect(iGot).toBeGreaterThanOrEqual(0);
  expect(iAnswered).toBeGreaterThan(iGot);
  if (iScan >= 0) expect(iScan).toBeLessThan(iAnswered);
  // Before lock-in nothing on the page or in the /start stream names the AI's cell, its correctness or its time.
  await expect(page.locator('[data-ai="true"]')).toHaveCount(0);
  await expect(page.getByTestId("ai-terminal")).not.toContainText(/\d\.\d\ds|r\dc\d/);
  for (const body of await Promise.all(startBodies)) expect(body).not.toMatch(/"choice"|"correct"|elapsedMs|r\dc\d/);
});
