import { describe, expect, it } from "vitest";
import { bandForLevel, bandsCoverLevels, FORMAL_DIFFICULTY, resolveFormalDifficulty, resolveSimAiCurve } from "@/config/ai-difficulty";
import { simulateCurve } from "../../scripts/sim-difficulty-core";

describe("difficulty config", () => {
  it("default bands cover levels 1..20 contiguously", () => {
    expect(bandsCoverLevels(FORMAL_DIFFICULTY.bands, 20)).toBe(true);
    expect(resolveFormalDifficulty(undefined)).toBe(FORMAL_DIFFICULTY);
  });

  it("applies a valid JSON override (subset of keys) and per-level overrides", () => {
    const config = resolveFormalDifficulty(JSON.stringify({ levelOverrides: { "8": { accuracy: 0.6 } } }), 20, () => undefined);
    expect(bandForLevel(config, 8).accuracy).toBe(0.6);
    expect(bandForLevel(config, 9).accuracy).toBe(0.88);
    expect(config.bands).toEqual(FORMAL_DIFFICULTY.bands);
  });

  it.each([
    ["not json", "{oops"],
    ["array", "[]"],
    ["probability out of range", JSON.stringify({ bands: [{ ...FORMAL_DIFFICULTY.bands[0], toLevel: 20, accuracy: 1.5 }] })],
    ["gap in bands", JSON.stringify({ bands: [FORMAL_DIFFICULTY.bands[0], FORMAL_DIFFICULTY.bands[2]] })],
    ["range max < min", JSON.stringify({ bands: [{ ...FORMAL_DIFFICULTY.bands[0], toLevel: 20, snap: { chance: 0.1, minMs: 500, maxMs: 100 } }] })],
    ["bad override key", JSON.stringify({ levelOverrides: { eight: { accuracy: 0.5 } } })],
  ])("falls back to defaults with a warning: %s", (_name, json) => {
    const warnings: string[] = [];
    expect(resolveFormalDifficulty(json, 20, (message) => warnings.push(message))).toBe(FORMAL_DIFFICULTY);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("SIM_AI_DIFFICULTY_JSON ignored");
  });

  it("curve flag defaults to v2", () => {
    expect(resolveSimAiCurve(undefined)).toBe("v2");
    expect(resolveSimAiCurve("v1")).toBe("v1");
    expect(resolveSimAiCurve("garbage")).toBe("v2");
  });
});

describe("expected human win rates (real human reaction data × curve × race rules)", () => {
  // Targets approved 2026-10-18 (revised): 1–5 easy for the human (~60%; capped by the measured ~60% solve rate),
  // 6–14 contested 30–40%, 15–20 AI dominates 5–10%, full 20-level run 25–35%, AI brutal from level 15.
  const targets: Record<string, [number, number]> = { "1-5": [0.52, 0.7], "6-10": [0.3, 0.4], "11-14": [0.3, 0.4], "15-20": [0.05, 0.1] };
  for (const seed of ["s1", "s2", "s3"]) {
    it(`lands every band, the full run and the brutal level on target (seed ${seed}, 12k rounds per band)`, () => {
      const result = simulateCurve(FORMAL_DIFFICULTY, 12_000, seed);
      for (const row of result.bands) {
        const [lo, hi] = targets[row.label];
        expect(row.rounds).toBeGreaterThanOrEqual(10_000);
        expect(row.humanWinRate, row.label).toBeGreaterThanOrEqual(lo);
        expect(row.humanWinRate, row.label).toBeLessThanOrEqual(hi);
      }
      // Mid levels each stay contested (no single level drops into "brutal" before 15).
      for (const row of result.perLevel.filter((r) => Number(r.label) >= 6 && Number(r.label) <= 14)) expect(row.humanWinRate, `level ${row.label}`).toBeGreaterThanOrEqual(0.25);
      expect(result.fullRun).toBeGreaterThanOrEqual(0.25);
      expect(result.fullRun).toBeLessThanOrEqual(0.35);
      expect(result.brutalFrom).toBe(15);
    });
  }
});
