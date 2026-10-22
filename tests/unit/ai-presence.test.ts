import { describe, expect, it } from "vitest";
import { AI_PRESENCE, presenceBand, QUICK_AI, QUICK_PRESENCE, scanCaptionAt } from "@/config/ai-presence";
import { buildAiEventSteps, aiStatusLabel } from "@/game/ai-activity";
import { planQuickAnswer } from "@/games/spot-the-difference/quick/quick-ai";
import { QUICK_MODES, type QuickModeKey } from "@/games/spot-the-difference/quick/puzzle";
import en from "@/i18n/messages/en";

describe("presence cues", () => {
  it("shows 'got the picture' within 180 ms and starts scanning after it", () => {
    expect(AI_PRESENCE.gotPictureMs.max).toBeLessThanOrEqual(150);
    for (const band of AI_PRESENCE.bands) expect(band.scanStartMs).toBeGreaterThan(AI_PRESENCE.gotPictureMs.max);
    expect(QUICK_PRESENCE.gotPictureMs).toBeLessThanOrEqual(180);
  });

  it("covers levels 1..20 and every caption is translated, with no 命/条 wording", () => {
    for (let level = 1; level <= 20; level++) expect(presenceBand(level).fromLevel).toBeLessThanOrEqual(level);
    const captions = [...AI_PRESENCE.bands.flatMap((band) => band.captions), ...QUICK_PRESENCE.captions];
    for (const caption of AI_PRESENCE.bands.flatMap((band) => band.captions)) expect(en[caption as keyof typeof en], caption).toBeTruthy();
    for (const caption of captions) expect(caption).not.toMatch(/[命条]/);
  });

  it("scan captions are a pure function of level and elapsed time (no answer, no AI time involved)", () => {
    expect(scanCaptionAt(1, 0)).toBeNull();
    const band = presenceBand(12);
    expect(scanCaptionAt(12, band.scanStartMs)).toBe(band.captions[0]);
    expect(scanCaptionAt(12, band.scanStartMs + band.captionEveryMs)).toBe(band.captions[1 % band.captions.length]);
  });

  it("the live timeline shows the caption while the AI works and never an AI cell or time", () => {
    const events = [{ event: "image" as const, at: 1 }, { event: "sent" as const, at: 2 }];
    const steps = buildAiEventSteps(events, { scanCaption: "AI 正在锁定目标…" });
    expect(steps.map((step) => step.label)).toEqual(["AI 看到了图片", "AI 正在锁定目标…"]);
    expect(JSON.stringify(steps)).not.toMatch(/r\dc\d|\d+\.\d+s/);
    expect(aiStatusLabel([{ event: "image", at: 1 }])).toBe("AI 看到了图片");
    expect(aiStatusLabel(events, { scanCaption: "AI 正在扫描画面…" })).toBe("AI 正在扫描画面…");
    expect(aiStatusLabel([...events, { event: "answered", at: 3 }], { scanCaption: "AI 正在扫描画面…" })).toBe("AI 已作答 🔒");
  });
});

describe("quick round AI", () => {
  it("has pacing for every mode, deterministic per seed, inside the clock, no sub-second snaps", () => {
    for (const key of Object.keys(QUICK_MODES) as QuickModeKey[]) {
      const mode = QUICK_MODES[key];
      expect(QUICK_AI.modes[key].medianMs).toHaveLength(mode.grids.length);
      for (let round = 0; round < mode.grids.length; round++) {
        const cells = mode.grids[round] ** 2;
        const input = { mode: key, round, limitMs: mode.limitS * 1000, correctChoice: "3", choices: Array.from({ length: cells }, (_, i) => String(i)), seed: `q-${key}-${round}` };
        const a = planQuickAnswer(input);
        expect(planQuickAnswer(input)).toEqual(a);
        expect(a.thinkMs).toBeGreaterThanOrEqual(QUICK_AI.minMs);
        expect(a.thinkMs).toBeLessThanOrEqual(mode.limitS * 1000 * 0.9);
        expect(a.correct).toBe(a.choice === "3");
      }
    }
  });
});
