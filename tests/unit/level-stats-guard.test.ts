import { hasAiStats, MIN_AI_SAMPLES } from "@/seo/level-stats";

const row = (aiSamples: number) => ({ level: 1, samples: 100, humanCorrect: 50, fastestHumanMs: 500, aiSamples, humanWins: 1, aiAnswered: aiSamples, aiCorrect: 0, aiAvgMs: 3000 });

test("AI figures on level pages wait for enough current-curve rounds", () => {
  expect(hasAiStats(undefined)).toBe(false);
  expect(hasAiStats(row(MIN_AI_SAMPLES - 1))).toBe(false);
  expect(hasAiStats(row(MIN_AI_SAMPLES))).toBe(true);
});
