import type { DecisionClient, DecisionInput, DecisionResult } from "../../server/decisions/contracts";

/**
 * In-game simulated AI opponent. No network, no model call: it "answers" after a plausible delay with a
 * plausible accuracy that depends on how far into the level set the round is. The game's race UX (captions,
 * lock-in, reveal, FX) runs unchanged on top of it. Live model adapters stay in this folder; switch back with
 * AI_MODE=live.
 *
 * Deterministic for a given seed (the round id), so a replayed/inspected round tells the same story.
 */
export interface SimulatedRound {
  level: number;
  totalLevels: number;
  limitMs: number;
  correctChoice: string;
  /** Usually the round id. */
  seed: string;
}

export interface SimulatedPlan {
  choice: string;
  correct: boolean;
  thinkMs: number;
  confidence: number;
  probabilities: Record<string, number>;
}

function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: tiny seeded PRNG, uniform in [0, 1). */
export function seededRandom(seed: string) {
  let state = fnv1a(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Accuracy falls from ~94% on level 1 to ~64% on the last level. */
export const simulatedAccuracy = (level: number, totalLevels: number) => 0.94 - 0.3 * progress(level, totalLevels);

const progress = (level: number, totalLevels: number) => (totalLevels <= 1 ? 0 : Math.min(1, Math.max(0, (level - 1) / (totalLevels - 1))));

/** Pure: what the simulated AI will answer, and when. */
export function planSimulatedAnswer(round: SimulatedRound, choices: string[]): SimulatedPlan {
  const random = seededRandom(`${round.seed}|${round.level}`);
  const p = progress(round.level, round.totalLevels);
  const correct = random() < simulatedAccuracy(round.level, round.totalLevels);
  const wrongChoices = choices.filter((choice) => choice !== round.correctChoice);
  const choice = correct || wrongChoices.length === 0 ? round.correctChoice : wrongChoices[Math.floor(random() * wrongChoices.length)];
  // Think time: 18% of the clock on easy levels, ~48% on the hardest, ±8% jitter; never instant, never late.
  const fraction = 0.18 + 0.3 * p + (random() - 0.5) * 0.16;
  const thinkMs = Math.round(Math.min(round.limitMs * 0.85, Math.max(650, round.limitMs * fraction)));
  const confidence = Number((correct ? 0.62 + 0.33 * random() * (1 - p / 2) : 0.28 + 0.25 * random()).toFixed(2));
  const runnerUp = correct ? wrongChoices[Math.floor(random() * Math.max(1, wrongChoices.length))] : round.correctChoice;
  const probabilities: Record<string, number> = { [choice]: confidence };
  if (runnerUp && runnerUp !== choice) probabilities[runnerUp] = Number(Math.max(0.01, (1 - confidence) * (0.5 + random() * 0.4)).toFixed(2));
  return { choice, correct, thinkMs, confidence, probabilities };
}

/** DecisionClient for one round of the simulated AI. Waits thinkMs (abortable), then answers. */
export function createSimulatedDecisionClient(round: SimulatedRound, sleep = defaultSleep): DecisionClient {
  return {
    async decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult> {
      const plan = planSimulatedAnswer(round, input.choices);
      const started = Date.now();
      const finished = await sleep(plan.thinkMs, signal);
      const elapsedMs = Date.now() - started;
      if (!finished) return { status: "error", choice: null, confidence: null, probabilities: {}, modelElapsedMs: 0, errorCode: "upstream_timeout", requestId: `sim:${round.seed}`, elapsedMs };
      return {
        status: "complete",
        choice: plan.choice,
        confidence: plan.confidence,
        probabilities: plan.probabilities,
        modelElapsedMs: plan.thinkMs,
        errorCode: null,
        requestId: `sim:${round.seed}`,
        elapsedMs,
      };
    },
  };
}

function defaultSleep(ms: number, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false);
    const timer = setTimeout(() => resolve(true), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
