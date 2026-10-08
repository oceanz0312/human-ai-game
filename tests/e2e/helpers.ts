import { expect, type Page, type TestInfo } from "@playwright/test";
import { LEVELS_V1 } from "../../src/server/levels/spec";

export const level = (n: number) => LEVELS_V1[n - 1];
const pad2 = (n: number) => String(n).padStart(2, "0");

export function cellName(choice: string) {
  const [, row, column] = /^r(\d)c(\d)$/.exec(choice) ?? [];
  return `第 ${row} 行第 ${column} 列`;
}

export async function startGame(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "开始挑战" }).click();
  await page.waitForURL(/\/play\//);
}

export async function waitForPlayable(page: Page, n: number) {
  await expect(page.locator(".game-header .level")).toHaveText(`${pad2(n)} / 20`, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "第 1 行第 1 列" })).toBeEnabled({ timeout: 20_000 });
}

export async function answer(page: Page, n: number, kind: "correct" | "wrong") {
  await waitForPlayable(page, n);
  const spec = level(n);
  const choice = kind === "correct" ? spec.correctChoice : spec.choices.find((c) => c !== spec.correctChoice)!;
  await page.getByRole("button", { name: cellName(choice) }).tap();
  await expect(page.getByText("答案揭晓")).toBeVisible();
}

export async function next(page: Page) {
  const button = page.getByRole("button", { name: /^(下一关|查看结果)/ });
  if (await button.isVisible().catch(() => false)) await button.click().catch(() => undefined);
}

/** Visual acceptance rules from docs/design/visual-style.md §11. */
export async function assertMobileLayout(page: Page) {
  const report = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const purple: string[] = [];
    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const style = getComputedStyle(element);
      const values = [style.color, style.backgroundColor, style.borderTopColor];
      if (values.some((value) => value === "rgb(109, 93, 252)") && !element.classList.contains("ai-dot")) {
        if (style.color === "rgb(109, 93, 252)" && (element.textContent ?? "").trim() === "") continue;
        purple.push(element.className || element.tagName);
      }
    }
    const cells = Array.from(document.querySelectorAll(".board .cell")).map((cell) => cell.getBoundingClientRect());
    const clipped = Array.from(document.querySelectorAll("h1, p, span, button, .value")).filter(
      (element) => !element.classList.contains("visually-hidden") && element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflow === "hidden",
    );
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      board: rect(".board"),
      image: rect(".board img"),
      primary: rect(".primary-action"),
      firstCell: cells[0] ? { left: cells[0].left, top: cells[0].top, width: cells[0].width } : null,
      lastCell: cells.length ? { right: cells[cells.length - 1].right, bottom: cells[cells.length - 1].bottom } : null,
      cellCount: cells.length,
      purple,
      clipped: clipped.length,
    };
  });

  expect(report.scrollWidth, "no horizontal scroll").toBeLessThanOrEqual(report.viewport.width);
  expect(report.purple, "purple is reserved for the AI status dot").toEqual([]);
  expect(report.clipped, "no clipped text").toBe(0);
  if (report.board) {
    expect(report.board.left).toBeGreaterThanOrEqual(0);
    expect(report.board.right).toBeLessThanOrEqual(report.viewport.width);
    expect(report.board.bottom, "board fits the first screen").toBeLessThanOrEqual(report.viewport.height);
    expect(Math.abs(report.board.width - report.board.height)).toBeLessThan(1);
    if (report.image && report.firstCell && report.lastCell) {
      const inset = (report.image.width * 24) / 1080;
      expect(Math.abs(report.firstCell.left - (report.image.left + inset))).toBeLessThan(1);
      expect(Math.abs(report.firstCell.top - (report.image.top + inset))).toBeLessThan(1);
      expect(Math.abs(report.lastCell.right - (report.image.right - inset))).toBeLessThan(1);
      expect(Math.abs(report.lastCell.bottom - (report.image.bottom - inset))).toBeLessThan(1);
      if (report.cellCount === 81) expect(report.firstCell.width, "9×9 touch target").toBeGreaterThanOrEqual(35);
    }
  }
  if (report.primary) expect(report.primary.bottom, "primary action reachable").toBeLessThanOrEqual(report.viewport.height);
}

export async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `test-results/screens/${testInfo.project.name}/${name}.png` });
}

export function recordForeignRequests(page: Page) {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http")) foreign.push(url.host);
  });
  return foreign;
}
