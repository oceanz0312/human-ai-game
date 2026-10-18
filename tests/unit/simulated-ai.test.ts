import { describe, expect, it } from "vitest";
import { createSimulatedDecisionClient, planSimulatedAnswer, simulatedAccuracy } from "@/models/adapters/simulated";

const choices = Array.from({ length: 81 }, (_, i) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`);

describe("simulated AI", () => {
  it("is deterministic per seed and stays inside the clock", () => {
    for (let level = 1; level <= 20; level++) {
      const round = { level, totalLevels: 20, limitMs: 10_000, correctChoice: "r3c4", seed: `round-${level}` };
      const a = planSimulatedAnswer(round, choices);
      expect(planSimulatedAnswer(round, choices)).toEqual(a);
      expect(a.thinkMs).toBeGreaterThanOrEqual(650);
      expect(a.thinkMs).toBeLessThanOrEqual(8_500);
      expect(choices).toContain(a.choice);
      expect(a.correct).toBe(a.choice === "r3c4");
    }
  });

  it("gets harder over the level set (accuracy and think time)", () => {
    expect(simulatedAccuracy(1, 20)).toBeCloseTo(0.94);
    expect(simulatedAccuracy(20, 20)).toBeCloseTo(0.64);
    const stats = (level: number) => {
      let right = 0;
      let time = 0;
      for (let i = 0; i < 2000; i++) {
        const plan = planSimulatedAnswer({ level, totalLevels: 20, limitMs: 10_000, correctChoice: "r1c1", seed: `s${i}` }, choices);
        right += plan.correct ? 1 : 0;
        time += plan.thinkMs;
      }
      return { accuracy: right / 2000, meanMs: time / 2000 };
    };
    const easy = stats(1);
    const hard = stats(20);
    expect(easy.accuracy).toBeGreaterThan(0.9);
    expect(hard.accuracy).toBeLessThan(0.72);
    expect(hard.accuracy).toBeGreaterThan(0.56);
    expect(hard.meanMs).toBeGreaterThan(easy.meanMs * 2);
  });

  it("answers through the DecisionClient contract without any network", async () => {
    const client = createSimulatedDecisionClient({ level: 1, totalLevels: 20, limitMs: 6000, correctChoice: "r1c1", seed: "x" }, async () => true);
    const result = await client.decide({ imageDataUrl: "data:image/png;base64,AA==", choices: choices.slice(0, 9) }, new AbortController().signal);
    expect(result.status).toBe("complete");
    expect(result.requestId).toBe("sim:x");
    const aborted = createSimulatedDecisionClient({ level: 1, totalLevels: 20, limitMs: 6000, correctChoice: "r1c1", seed: "x" }, async () => false);
    expect((await aborted.decide({ imageDataUrl: "data:image/png;base64,AA==", choices: choices.slice(0, 9) }, new AbortController().signal)).status).toBe("error");
  });
});
