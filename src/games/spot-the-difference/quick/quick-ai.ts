import { QUICK_AI } from "@/config/ai-presence";
import { sampleSimAnswer, seededRandom } from "@/models/adapters/sim-sampler";
import type { QuickModeKey } from "./puzzle";

export interface QuickAiPlan {
  choice: string;
  correct: boolean;
  thinkMs: number;
}

/** Simulated AI for one quick-round puzzle (browser only, no ranking, no daily limit). Deterministic per seed. */
export function planQuickAnswer(input: { mode: QuickModeKey; round: number; limitMs: number; correctChoice: string; choices: string[]; seed: string }): QuickAiPlan {
  const pacing = QUICK_AI.modes[input.mode];
  const index = Math.min(input.round, pacing.medianMs.length - 1);
  const sample = sampleSimAnswer(
    seededRandom(input.seed),
    {
      accuracy: pacing.accuracy[index],
      medianMs: pacing.medianMs[index],
      spread: QUICK_AI.spread,
      minMs: QUICK_AI.minMs,
      snap: { chance: 0, minMs: 0, maxMs: 0 },
      hesitate: QUICK_AI.hesitate,
    },
    input.limitMs,
    QUICK_AI.maxFractionOfLimit,
  );
  const wrong = input.choices.filter((choice) => choice !== input.correctChoice);
  const correct = sample.correct || wrong.length === 0;
  const choice = correct ? input.correctChoice : wrong[Math.floor(sample.extras[3] * wrong.length)];
  return { choice, correct, thinkMs: sample.thinkMs };
}
