import { describe, expect, it } from "vitest";
import { bandForLevel, bandsCoverLevels, FORMAL_DIFFICULTY, resolveFormalDifficulty, resolveSimAiCurve } from "@/config/ai-difficulty";
import { simulateBands } from "../../scripts/sim-difficulty-core";

describe("difficulty config", () => {
  it("default bands cover levels 1..20 contiguously", () => {
    expect(bandsCoverLevels(FORMAL_DIFFICULTY.bands, 20)).toBe(true);
    expect(resolveFormalDifficulty(undefined)).toBe(FORMAL_DIFFICULTY);
  });

  it("applies a valid JSON override (subset of keys) and per-level overrides", () => {
    const config = resolveFormalDifficulty(JSON.stringify({ levelOverrides: { "8": { accuracy: 0.6 } } }), 20, () => undefined);
    expect(bandForLevel(config, 8).accuracy).toBe(0.6);
    expect(bandForLevel(config, 9).accuracy).toBe(0.9);
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
  // Targets approved 2026-10-18: 1–3 ≈ 38%, 4–10 ≈ 25%, 11–20 ≈ 5%.
  const targets: Record<string, [number, number]> = { "1-3": [0.33, 0.43], "4-10": [0.2, 0.3], "11-20": [0.04, 0.06] };
  for (const seed of ["s1", "s2", "s3"]) {
    it(`lands every band in its target range (seed ${seed}, 12k rounds per band)`, () => {
      for (const row of simulateBands(FORMAL_DIFFICULTY, 12_000, seed)) {
        const [lo, hi] = targets[row.band];
        expect(row.rounds).toBeGreaterThanOrEqual(10_000);
        expect(row.humanWinRate, row.band).toBeGreaterThanOrEqual(lo);
        expect(row.humanWinRate, row.band).toBeLessThanOrEqual(hi);
      }
    });
  }
});
