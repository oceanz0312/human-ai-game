import type { DecisionClient, DecisionInput, DecisionResult } from "../../server/decisions/contracts";
import { cosmeticProbabilities, sampleSimAnswer, seededRandom, type SimBandParams } from "./sim-sampler";

export { seededRandom } from "./sim-sampler";

/**
 * In-game simulated AI opponent. No network, no model call: it "answers" at a sampled moment with a sampled accuracy
 * taken from the configured difficulty curve (src/config/ai-difficulty.ts). The game's race UX (captions, lock-in,
 * reveal, FX) runs unchanged on top of it. Live model adapters stay in this folder; switch back with AI_MODE=live.
 *
 * Deterministic for a given seed. On the server the seed is an HMAC of the round id (src/server/sim-seed.ts), so the
 * browser cannot precompute the AI's outcome even though this file ships in the client bundle.
 */
export interface SimulatedRound {
  level: number;
  totalLevels: number;
  limitMs: number;
  correctChoice: string;
  /** Server: HMAC(round id). Tests: anything. */
  seed: string;
  /** Kept in requestId so a stored answer can be traced back to its round and curve version. */
  requestId?: string;
}

export interface SimulatedPlan {
  choice: string;
  correct: boolean;
  /** Answer time measured from the moment the level was shown. */
  thinkMs: number;
  confidence: number;
  probabilities: Record<string, number>;
}

const progress = (level: number, totalLevels: number) => (totalLevels <= 1 ? 0 : Math.min(1, Math.max(0, (level - 1) / (totalLevels - 1))));

/** v2: band-driven plan (log-normal timing, snap answers, hesitation). */
export function planSimulatedAnswer(round: SimulatedRound, choices: string[], band: SimBandParams, maxFractionOfLimit = 0.9): SimulatedPlan {
  const random = seededRandom(`${round.seed}|${round.level}`);
  const sample = sampleSimAnswer(random, band, round.limitMs, maxFractionOfLimit);
  const wrongChoices = choices.filter((choice) => choice !== round.correctChoice);
  const correct = sample.correct || wrongChoices.length === 0;
  const choice = correct ? round.correctChoice : wrongChoices[Math.floor(sample.extras[3] * wrongChoices.length)];
  const { confidence, probabilities } = cosmeticProbabilities({ ...sample, correct }, choice, round.correctChoice, wrongChoices, progress(round.level, round.totalLevels));
  return { choice, correct, thinkMs: sample.thinkMs, confidence, probabilities };
}

/** v1 (2026-10-18 morning, kill switch SIM_AI_CURVE=v1): accuracy 94%→64%, think time 18%→48% of the level clock. */
export const simulatedAccuracyV1 = (level: number, totalLevels: number) => 0.94 - 0.3 * progress(level, totalLevels);

export function planSimulatedAnswerV1(round: SimulatedRound, choices: string[]): SimulatedPlan {
  const random = seededRandom(`${round.seed}|${round.level}`);
  const p = progress(round.level, round.totalLevels);
  const correct = random() < simulatedAccuracyV1(round.level, round.totalLevels);
  const wrongChoices = choices.filter((choice) => choice !== round.correctChoice);
  const choice = correct || wrongChoices.length === 0 ? round.correctChoice : wrongChoices[Math.floor(random() * wrongChoices.length)];
  const fraction = 0.18 + 0.3 * p + (random() - 0.5) * 0.16;
  const thinkMs = Math.round(Math.min(round.limitMs * 0.85, Math.max(650, round.limitMs * fraction)));
  const confidence = Number((correct ? 0.62 + 0.33 * random() * (1 - p / 2) : 0.28 + 0.25 * random()).toFixed(2));
  const runnerUp = correct ? wrongChoices[Math.floor(random() * Math.max(1, wrongChoices.length))] : round.correctChoice;
  const probabilities: Record<string, number> = { [choice]: confidence };
  if (runnerUp && runnerUp !== choice) probabilities[runnerUp] = Number(Math.max(0.01, (1 - confidence) * (0.5 + random() * 0.4)).toFixed(2));
  return { choice, correct, thinkMs, confidence, probabilities };
}

export interface SimulatedClientOptions {
  /** Planner bound to the active curve (v2 band or v1). */
  plan: (choices: string[]) => SimulatedPlan;
  /** Server instant the level was shown: the answer lands at shownAt + thinkMs, whatever the server overhead. */
  shownAt?: number;
  now?: () => number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<boolean>;
}

/** DecisionClient for one round of the simulated AI. Waits until shownAt + thinkMs (abortable), then answers. */
export function createSimulatedDecisionClient(round: SimulatedRound, options: SimulatedClientOptions): DecisionClient {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const requestId = round.requestId ?? `sim:${round.seed}`;
  return {
    async decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult> {
      const plan = options.plan(input.choices);
      const started = now();
      const anchor = options.shownAt ?? started;
      const finished = await sleep(Math.max(0, anchor + plan.thinkMs - started), signal);
      const elapsedMs = now() - started;
      if (!finished) return { status: "error", choice: null, confidence: null, probabilities: {}, modelElapsedMs: 0, errorCode: "upstream_timeout", requestId, elapsedMs };
      return {
        status: "complete",
        choice: plan.choice,
        confidence: plan.confidence,
        probabilities: plan.probabilities,
        modelElapsedMs: plan.thinkMs,
        errorCode: null,
        requestId,
        elapsedMs,
      };
    },
  };
}

function defaultSleep(ms: number, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false);
    if (ms <= 0) return resolve(true);
    const timer = setTimeout(() => resolve(true), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
