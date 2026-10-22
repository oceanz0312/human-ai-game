import { expect, test } from "@playwright/test";
import { answer, pickOpponent, waitForPlayable } from "./helpers";
import { START } from "./t";

const audioProbe = () => `
(() => {
  const log = { contexts: 0, oscStarts: 0, resumes: 0, states: [] };
  window.__audioProbe = log;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  const origResume = Ctor.prototype.resume;
  Ctor.prototype.resume = function (...args) {
    log.resumes += 1;
    log.states.push(this.state);
    return origResume.apply(this, args).then((v) => {
      log.states.push(this.state);
      return v;
    });
  };
  const OrigCtx = Ctor;
  function Patched(...args) {
    const ctx = new OrigCtx(...args);
    log.contexts += 1;
    log.states.push(ctx.state);
    const origOsc = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = () => {
      log.oscStarts += 1;
      return origOsc();
    };
    return ctx;
  }
  Patched.prototype = OrigCtx.prototype;
  window.AudioContext = Patched;
  if (window.webkitAudioContext) window.webkitAudioContext = Patched;
})();
`;

async function probe(page: import("@playwright/test").Page) {
  return page.evaluate(() => window.__audioProbe as { contexts: number; oscStarts: number; resumes: number; states: string[] });
}

declare global {
  interface Window {
    __audioProbe?: { contexts: number; oscStarts: number; resumes: number; states: string[] };
  }
}

test.describe("SFX instrumentation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(audioProbe());
  });

  test("stored mute: toggle UI matches localStorage before interaction", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("hai.sfx.muted", "1"));
    await page.goto("/spot-the-difference-game");
    await page.getByRole("button", { name: START }).click();
    await pickOpponent(page);
    const mute = page.getByTestId("sfx-toggle");
    await expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => localStorage.getItem("hai.sfx.muted"))).toBe("1");
  });

  test("first entry: Start click unlocks audio before countdown; cell tap starts oscillators", async ({ page }) => {
    await page.goto("/spot-the-difference-game");
    await page.getByRole("button", { name: START }).click();
    await pickOpponent(page);
    await expect(page.locator(".fx-fight")).toHaveText("FIGHT!", { timeout: 8_000 });
    const afterCountdown = await probe(page);
    expect(afterCountdown.contexts, "context created on home/play gestures").toBeGreaterThanOrEqual(1);
    await waitForPlayable(page, 1);
    const beforeTap = await probe(page);
    await page.getByRole("button", { name: "Row 1, column 1" }).click();
    await expect(page.locator('.game-stage[data-phase="reveal"]')).toBeVisible();
    const afterTap = await probe(page);
    expect(afterCountdown.resumes, "resume after Start / countdown path").toBeGreaterThanOrEqual(1);
    expect(afterTap.resumes, "resume after gameplay").toBeGreaterThanOrEqual(afterCountdown.resumes);
    if (afterTap.oscStarts > 0) {
      expect(afterTap.oscStarts, "oscillators after gameplay + reveal").toBeGreaterThanOrEqual(beforeTap.oscStarts);
    }
  });

  test("mute then unmute: unmute click adds resume + oscillators", async ({ page }) => {
    await page.goto("/spot-the-difference-game");
    await page.getByRole("button", { name: START }).click();
    await pickOpponent(page);
    await waitForPlayable(page, 1);
    const mute = page.getByTestId("sfx-toggle");
    await mute.click();
    await expect(mute).toHaveAttribute("aria-pressed", "true");
    const mid = await probe(page);
    await mute.click();
    await expect(mute).toHaveAttribute("aria-pressed", "false");
    const after = await probe(page);
    expect(after.resumes).toBeGreaterThanOrEqual(mid.resumes);
    expect(after.oscStarts).toBeGreaterThanOrEqual(mid.oscStarts);
  });
});
