import { describe, expect, it } from "vitest";
import { bandForLevel, FORMAL_DIFFICULTY } from "@/config/ai-difficulty";
import { createSimulatedDecisionClient, planSimulatedAnswer, planSimulatedAnswerV1, simulatedAccuracyV1 } from "@/models/adapters/simulated";
import { sampleSimAnswer, seededRandom, type SimBandParams } from "@/models/adapters/sim-sampler";
import { LEVELS_V1 } from "@/server/levels/spec";

const choices = Array.from({ length: 81 }, (_, i) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`);
const round = (level: number, seed: string) => ({ level, totalLevels: 20, limitMs: LEVELS_V1[level - 1].limitMs, correctChoice: "r3c4", seed });
const plan = (level: number, seed: string) => planSimulatedAnswer(round(level, seed), choices, bandForLevel(FORMAL_DIFFICULTY, level), FORMAL_DIFFICULTY.maxFractionOfLimit);

describe("seeded RNG", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = seededRandom("x");
    const b = seededRandom("x");
    const c = seededRandom("y");
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("simulated AI v2 (band curve)", () => {
  it("is deterministic per seed, stays inside the clock and answers a valid cell", () => {
    for (let level = 1; level <= 20; level++) {
      for (let i = 0; i < 50; i++) {
        const a = plan(level, `round-${level}-${i}`);
        expect(plan(level, `round-${level}-${i}`)).toEqual(a);
        expect(a.thinkMs).toBeGreaterThan(0);
        expect(a.thinkMs).toBeLessThanOrEqual(LEVELS_V1[level - 1].limitMs * 0.9);
        expect(choices).toContain(a.choice);
        expect(a.correct).toBe(a.choice === "r3c4");
        expect(a.probabilities[a.choice]).toBe(a.confidence);
      }
    }
  });

  it("matches each band's configured accuracy, median, snap share and floor (10k draws per band)", () => {
    for (const band of FORMAL_DIFFICULTY.bands) {
      const random = seededRandom(`band-${band.fromLevel}`);
      const n = 10_000;
      let correct = 0;
      let snaps = 0;
      const times: number[] = [];
      const regular: number[] = [];
      for (let i = 0; i < n; i++) {
        const s = sampleSimAnswer(random, band, 60_000, 0.9);
        if (s.correct) correct++;
        if (s.snapped) {
          snaps++;
          if (!s.hesitated) {
            expect(s.thinkMs).toBeGreaterThanOrEqual(band.snap.minMs);
            expect(s.thinkMs).toBeLessThanOrEqual(band.snap.maxMs);
          }
        } else {
          expect(s.thinkMs).toBeGreaterThanOrEqual(band.minMs);
          if (!s.hesitated) regular.push(s.thinkMs);
        }
        times.push(s.thinkMs);
      }
      regular.sort((a, b) => a - b);
      expect(Math.abs(correct / n - band.accuracy)).toBeLessThan(0.02);
      expect(Math.abs(snaps / n - band.snap.chance)).toBeLessThan(0.02);
      const median = regular[Math.floor(regular.length / 2)];
      expect(Math.abs(median - Math.max(band.minMs, band.medianMs)) / band.medianMs).toBeLessThan(0.05);
    }
  });

  it("the warm-up band is the slowest and least accurate, the last band the fastest and most accurate", () => {
    const bands = FORMAL_DIFFICULTY.bands;
    const first = bands[0];
    const last = bands[bands.length - 1];
    for (const band of bands) {
      expect(band.accuracy).toBeGreaterThanOrEqual(first.accuracy);
      expect(band.accuracy).toBeLessThanOrEqual(last.accuracy);
      expect(band.medianMs).toBeLessThanOrEqual(first.medianMs);
      expect(band.medianMs).toBeGreaterThanOrEqual(last.medianMs);
    }
    // Hard band answers like a fast vision model: median well under a second, with JEV-like snaps.
    const hard = Array.from({ length: 4000 }, (_, i) => plan(15, `h${i}`).thinkMs).sort((a, b) => a - b);
    expect(hard[2000]).toBeLessThan(600);
    expect(hard[400]).toBeLessThan(300);
  });

  it("caps hesitation inside the level clock", () => {
    const always: SimBandParams = { accuracy: 1, medianMs: 5000, spread: 0, minMs: 0, snap: { chance: 0, minMs: 0, maxMs: 0 }, hesitate: { chance: 1, minMs: 5000, maxMs: 5000 } };
    expect(sampleSimAnswer(seededRandom("cap"), always, 3000, 0.9).thinkMs).toBe(2700);
  });
});

describe("simulated AI v1 (kill switch)", () => {
  it("keeps the original curve", () => {
    expect(simulatedAccuracyV1(1, 20)).toBeCloseTo(0.94);
    expect(simulatedAccuracyV1(20, 20)).toBeCloseTo(0.64);
    const a = planSimulatedAnswerV1({ ...round(1, "v1"), limitMs: 10_000 }, choices);
    expect(a.thinkMs).toBeGreaterThanOrEqual(650);
    expect(a.thinkMs).toBeLessThanOrEqual(8_500);
  });
});

describe("simulated decision client", () => {
  const input = { imageDataUrl: "", choices: choices.slice(0, 9) };
  const fixed = { choice: "r1c1", correct: true, thinkMs: 700, confidence: 0.9, probabilities: { r1c1: 0.9 } };

  it("answers at shownAt + thinkMs, whatever time already passed", async () => {
    let clock = 10_000;
    const slept: number[] = [];
    const client = createSimulatedDecisionClient(
      { ...round(1, "x"), requestId: "sim:sim-v2:abc" },
      { plan: () => fixed, shownAt: 9_800, now: () => clock, sleep: async (ms) => (slept.push(ms), (clock += ms), true) },
    );
    const result = await client.decide(input, new AbortController().signal);
    expect(slept).toEqual([500]);
    expect(result).toMatchObject({ status: "complete", choice: "r1c1", modelElapsedMs: 700, requestId: "sim:sim-v2:abc" });
  });

  it("reports an aborted wait as upstream_timeout", async () => {
    const client = createSimulatedDecisionClient(round(1, "x"), { plan: () => fixed, sleep: async () => false });
    expect((await client.decide(input, new AbortController().signal)).status).toBe("error");
  });
});
