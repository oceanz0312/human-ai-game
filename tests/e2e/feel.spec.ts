import { expect, test } from "@playwright/test";
import { answer, next, pickOpponent, startGame } from "./helpers";

test("@viewport feel kit: 3-2-1 FIGHT, mute toggle, banners, combo and the result grid", async ({ page }) => {
  await page.goto("/zh/spot-the-difference");
  await page.getByRole("button", { name: "开始挑战" }).click();
  await pickOpponent(page);
  await expect(page.locator(".fx-fight")).toHaveText("FIGHT!", { timeout: 6_000 });

  const mute = page.getByTestId("sfx-toggle");
  await expect(mute).toHaveAttribute("aria-pressed", "false");

  await answer(page, 1, "correct");
  await expect(page.getByTestId("result-banner")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `test-results/screens/feel-banner-${test.info().project.name}.png` });
  await next(page);
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("hai.sfx.muted"))).toBe("1");

  await answer(page, 2, "correct");
  await expect(page.getByTestId("streak")).toContainText("×2");
  for (let n = 3; n <= 5; n += 1) {
    await next(page);
    await answer(page, n, "wrong");
  }
  await next(page);
  await page.waitForURL(/\/result\//);
  const grid = page.getByTestId("result-grid");
  await expect(grid).toBeVisible();
  const squares = (await grid.locator("pre").textContent())?.replace(/\s/g, "") ?? "";
  expect([...squares].length).toBe(5);
  await expect(page.getByTestId("copy-grid")).toBeVisible();
  await page.screenshot({ path: `test-results/screens/feel-result-grid-${test.info().project.name}.png`, fullPage: true });
});

test("result grid squares match the levels played", async ({ page }) => {
  await startGame(page);
  for (let n = 1; n <= 3; n += 1) {
    await answer(page, n, "wrong");
    await next(page);
  }
  await page.waitForURL(/\/result\//);
  await expect(page.getByTestId("result-grid").locator("pre")).toHaveText(/^[🟥🟦⬛⬜]{3}$/u);
});
