import {
  buildSyntheticProbabilities,
  describeTopCandidates,
  hesitationFromProbabilities,
  buildTimingTimeline,
  parseStoredProbabilities,
} from "@/game/ai-insights";

test("synthetic probabilities sum to one and peak on the chosen cell", () => {
  const choices = ["r1c1", "r1c2", "r1c3", "r2c1", "r2c2", "r2c3", "r3c1", "r3c2", "r3c3"];
  const probs = buildSyntheticProbabilities(choices, "r2c2", 0.71);
  const sum = Object.values(probs).reduce((total, value) => total + value, 0);
  expect(sum).toBeCloseTo(1, 5);
  expect(probs.r2c2).toBe(0.71);
  expect(probs.r1c1).toBeGreaterThan(probs.r3c3);
});

test("top candidates and hesitation read naturally", () => {
  const probs = { r2c3: 0.71, r1c1: 0.18, r3c3: 0.04 };
  expect(describeTopCandidates(probs)).toBe("r2c3 71% · r1c1 18%");
  expect(hesitationFromProbabilities(probs).label).toBe("相当笃定");
  expect(hesitationFromProbabilities({ r2c3: 0.41, r1c1: 0.39 }).label).toBe("非常犹豫");
});

test("timing timeline splits model and overhead from measured values", () => {
  expect(buildTimingTimeline(450, 320)).toMatchObject({ totalMs: 450, modelMs: 320, overheadMs: 130, hasData: true });
  expect(buildTimingTimeline(null, 100).hasData).toBe(false);
});

test("stored probabilities tolerate missing or invalid JSON", () => {
  expect(parseStoredProbabilities(JSON.stringify({ r1c1: 0.5 }))).toEqual({ r1c1: 0.5 });
  expect(parseStoredProbabilities("not-json")).toBeNull();
  expect(parseStoredProbabilities(null)).toBeNull();
});
