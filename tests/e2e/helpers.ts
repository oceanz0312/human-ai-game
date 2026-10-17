import { expect, type Page, type TestInfo } from "@playwright/test";
import { LEVELS_V1 } from "../../src/server/levels/spec";

export const level = (n: number) => LEVELS_V1[n - 1];
const pad2 = (n: number) => String(n).padStart(2, "0");

export function cellName(choice: string) {
  const [, row, column] = /^r(\d)c(\d)$/.exec(choice) ?? [];
  return `第 ${row} 行第 ${column} 列`;
}

/** The opponent-select step (always shown, even with one live opponent). */
export async function pickOpponent(page: Page) {
  await expect(page.getByTestId("opponent-select")).toBeVisible();
  await page.getByRole("button", { name: /开始对战|Fight/ }).click();
  await page.waitForURL(/\/play\//);
}

export async function startGame(page: Page) {
  await page.goto("/zh/spot-the-difference");
  await page.getByRole("button", { name: "开始挑战" }).click();
  await pickOpponent(page);
}

export async function waitForPlayable(page: Page, n: number) {
  await expect(page.locator('.game-stage[data-phase="reveal"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator(".game-hud .level")).toHaveText(`${pad2(n)} / 20`, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "第 1 行第 1 列" })).toBeEnabled({ timeout: 20_000 });
}

export async function answer(page: Page, n: number, kind: "correct" | "wrong") {
  await waitForPlayable(page, n);
  const spec = level(n);
  const choice = kind === "correct" ? spec.correctChoice : spec.choices.find((c) => c !== spec.correctChoice)!;
  await page.getByRole("button", { name: cellName(choice) }).click();
  await expect(page.getByText("答案揭晓")).toBeVisible();
}

export async function next(page: Page) {
  const revealNext = page.getByTestId("reveal-next");
  const button = (await revealNext.count()) > 0 ? revealNext : page.getByRole("button", { name: /^(下一关|查看结果)/ });
  await expect(button).toBeVisible({ timeout: 10_000 });
  await button.click();
  await page.waitForFunction(
    () => document.querySelector('.game-stage:not([data-phase="reveal"]) .game-hud .level') != null || location.pathname.startsWith("/result/"),
    undefined,
    { timeout: 20_000 },
  );
}

export async function assertOneScreen(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    scrollY: window.scrollY,
  }));
  expect(metrics.scrollY, "page starts at top").toBe(0);
  expect(metrics.scrollHeight, "no vertical scroll").toBeLessThanOrEqual(metrics.innerHeight + 1);
  expect(metrics.scrollWidth, "no horizontal scroll").toBeLessThanOrEqual(metrics.innerWidth + 1);
}

export async function assertRevealNextBelowBoard(page: Page) {
  const layout = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="reveal-next"]');
    const board = document.querySelector('[data-testid="reveal-board"]');
    if (!button || !board) return null;
    const b = button.getBoundingClientRect();
    const h = board.getBoundingClientRect();
    return {
      buttonTop: b.top,
      boardBottom: h.bottom,
      overlapX: Math.min(b.right, h.right) - Math.max(b.left, h.left),
      buttonInView: b.top >= 0 && b.bottom <= window.innerHeight,
    };
  });
  expect(layout, "reveal layout present").not.toBeNull();
  expect(layout!.buttonInView, "reveal next in viewport").toBe(true);
  expect(layout!.buttonTop, "next below board").toBeGreaterThanOrEqual(layout!.boardBottom - 1);
  expect(layout!.buttonTop - layout!.boardBottom, "next sits directly under the board").toBeLessThanOrEqual(40);
  expect(layout!.overlapX, "next is in the board column").toBeGreaterThan(0);
}

/** Content pages (option B) may scroll vertically but never sideways. */
export async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(metrics.scrollWidth, "no horizontal scroll").toBeLessThanOrEqual(metrics.innerWidth + 1);
}

/** Copy rules: chances, never lives. */
export async function assertNoForbiddenWords(page: Page) {
  const text = await page.evaluate(() => document.body.innerText);
  expect(text, "no 命/条 life wording").not.toMatch(/命|\d\s*条|lives\b/i);
}

export async function boardSize(page: Page) {
  return page.evaluate(() => {
    const board = document.querySelector(".board-stage .board");
    if (!board) return null;
    const r = board.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

/** Every visible danmaku pill must sit outside the board rectangle. */
export async function assertDanmakuOffBoard(page: Page) {
  const overlap = await page.evaluate(() => {
    const board = document.querySelector(".board-stage .board");
    if (!board) return null;
    const b = board.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll(".ai-danmaku-item")).map((el) => el.getBoundingClientRect());
    return {
      count: items.length,
      overlapping: items.filter((r) => r.bottom > b.top + 2 && r.top < b.bottom && r.right > b.left && r.left < b.right).length,
    };
  });
  expect(overlap, "board present").not.toBeNull();
  expect(overlap!.count, "at most two danmaku").toBeLessThanOrEqual(2);
  expect(overlap!.overlapping, "danmaku never covers board").toBe(0);
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
      (element) =>
        !element.classList.contains("visually-hidden") &&
        // danmaku pills ellipsize by design
        !element.classList.contains("ai-danmaku-item") &&
        // terminal lines, crumbs and AI status ellipsize by design
        !element.closest(".ai-terminal, .game-crumb, .vs-state, .ai-danmaku, .verdict-detail") &&
        element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflow === "hidden",
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
  const onReveal = await page.evaluate(() => Boolean(document.querySelector('.game-stage[data-phase="reveal"]')));
  if (report.board) {
    expect(report.board.left).toBeGreaterThanOrEqual(0);
    expect(report.board.right).toBeLessThanOrEqual(report.viewport.width);
    if (!onReveal) expect(report.board.bottom, "board fits the first screen").toBeLessThanOrEqual(report.viewport.height);
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
  if (report.primary) {
    if (onReveal) {
      expect(report.primary.top, "reveal primary visible").toBeGreaterThanOrEqual(0);
      expect(report.primary.bottom, "reveal primary in viewport").toBeLessThanOrEqual(report.viewport.height);
    } else {
      expect(report.primary.bottom, "primary action reachable").toBeLessThanOrEqual(report.viewport.height);
    }
  }
  // Game pages are strictly one viewport; site pages (option B) may scroll below a self-contained first screen.
  if (await page.locator(".game-stage").count()) await assertOneScreen(page);
  else await assertNoHorizontalOverflow(page);
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

/** Locale-neutral content routes (one-screen + SEO checks). */
export const CONTENT_PATHS = [
  "/",
  "/spot-the-difference",
  "/find-the-difference",
  "/human-vs-ai",
  "/games",
  "/how-to-play",
  "/faq",
  "/about",
  "/privacy",
  "/terms",
  "/ai-opponents",
  "/ai-opponents/luna",
  "/games/spot-the-difference/leaderboard",
  "/games/spot-the-difference/play",
];
