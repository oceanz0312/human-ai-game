import { expect, test } from "@playwright/test";
import { answer, next, startGame, waitForPlayable } from "./helpers";
import { cueLatency, installPresenceProbe, readPresence } from "./presence-probe";
import { rx, t } from "./t";

// Runs against AI_MODE=simulated (playwright.sim.config.ts): the production opponent.

test("simulated AI: immediate presence, server-timed sealed answer, honest reveal, no auto-advance", async ({ page }) => {
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
  const answered = cueLatency(probe, t("AI 已作答 🔒"));
  test.info().annotations.push({ type: "got-picture-ms", description: String(Math.round(gotPicture ?? -1)) });
  test.info().annotations.push({ type: "answered-ms", description: String(Math.round(answered ?? -1)) });
  expect(gotPicture!).toBeLessThanOrEqual(300);
  // Level 1 band: floor 800 ms, never instant.
  expect(answered!).toBeGreaterThan(700);
  for (const body of await Promise.all(startBodies)) expect(body).not.toMatch(/"choice"|"correct"|elapsedMs|r\dc\d/);

  await answer(page, 1, "correct");
  await expect(page.getByTestId("ai-timeline")).toContainText(new RegExp(`${rx("AI 给出答案")} · \\d\\.\\d\\ds · (${rx("答对")}|${rx("看错了")})`));
  // No auto-advance: the reveal stays until the player taps next.
  await page.waitForTimeout(4000);
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible();
  await next(page);
  await waitForPlayable(page, 2);
});

test("quick round: presence captions, unlimited replays, pacing in seconds", async ({ page }) => {
  await page.goto("/");
  const board = page.getByTestId("quick-board");
  await expect(board).toBeVisible();
  for (let match = 0; match < 2; match++) {
    for (let puzzle = 0; puzzle < 3; puzzle++) {
      if (puzzle === 0) await page.getByTestId("quick-start").click();
      const status = page.getByTestId("quick-ai-status");
      await expect(status).toHaveText("Luna AI got the picture", { timeout: 2_000 });
      await expect(status).toHaveText(/Luna AI is (scanning|comparing|double-checking)/, { timeout: 3_000 });
      await page.getByTestId("quick-cell").first().click();
      await expect(page.getByTestId("quick-result")).toHaveText(/You win!|AI wins|No winner/);
      await page.getByTestId("quick-next").click();
    }
    await expect(page.getByTestId("quick-done")).toBeVisible();
    await page.getByRole("button", { name: /New puzzles/ }).click();
  }
});
