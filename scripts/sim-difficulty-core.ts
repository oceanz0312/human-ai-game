import { bandForLevel, type FormalDifficulty } from "../src/config/ai-difficulty";
import { resolveRace } from "../src/game/rules";
import { planSimulatedAnswer } from "../src/models/adapters/simulated";
import { seededRandom } from "../src/models/adapters/sim-sampler";
import { LEVELS_V1 } from "../src/server/levels/spec";
import data from "./data/human-reaction-v1.json";

export interface BandResult {
  band: string;
  rounds: number;
  humanWinRate: number;
  winRateWhenHumanCorrect: number;
  aiCorrectRate: number;
  aiP10: number;
  aiMedian: number;
  aiP90: number;
}

const levels = data.levels as Record<string, { rounds: number; humanCorrect: number; correctMs: number[] }>;
const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

/**
 * Replays real human outcomes (per band: correct rate + correct-answer times from D1) against the configured curve
 * and the real race rules. Deterministic (seeded), so tests can assert target ranges.
 */
export function simulateBands(config: FormalDifficulty, roundsPerBand = 20_000, seed = "sim"): BandResult[] {
  const random = seededRandom(seed);
  return config.bands.map((band) => {
    let rounds = 0;
    let correctRounds = 0;
    let winsAll = 0;
    let winsWhenCorrect = 0;
    let aiCorrect = 0;
    let humanRounds = 0;
    let humanCorrect = 0;
    const times: number[] = [];
    for (let level = band.fromLevel; level <= band.toLevel; level++) {
      humanRounds += levels[String(level)]?.rounds ?? 0;
      humanCorrect += levels[String(level)]?.humanCorrect ?? 0;
      times.push(...(levels[String(level)]?.correctMs ?? []));
    }
    const correctRate = humanRounds ? humanCorrect / humanRounds : 0.6;
    const choices = Array.from({ length: 81 }, (_, i) => `c${i}`);
    const aiTimes: number[] = [];
    for (let i = 0; i < roundsPerBand; i++) {
      const level = band.fromLevel + Math.floor(random() * (band.toLevel - band.fromLevel + 1));
      const spec = LEVELS_V1[level - 1];
      const plan = planSimulatedAnswer(
        { level, totalLevels: config.bands[config.bands.length - 1].toLevel, limitMs: spec.limitMs, correctChoice: "c0", seed: `${seed}-${band.fromLevel}-${i}` },
        choices,
        bandForLevel(config, level),
        config.maxFractionOfLimit,
      );
      const humanIsCorrect = random() < correctRate;
      const humanMs = times.length ? times[Math.floor(random() * times.length)] : 2000;
      const race = resolveRace({ humanCorrect: humanIsCorrect, humanElapsedMs: humanMs, aiStatus: "complete", aiCorrect: plan.correct, aiElapsedMs: plan.thinkMs });
      rounds++;
      if (plan.correct) aiCorrect++;
      aiTimes.push(plan.thinkMs);
      if (race.winner === "human") winsAll++;
      if (humanIsCorrect) {
        correctRounds++;
        if (race.winner === "human") winsWhenCorrect++;
      }
    }
    aiTimes.sort((a, b) => a - b);
    return {
      band: `${band.fromLevel}-${band.toLevel}`,
      rounds,
      humanWinRate: winsAll / rounds,
      winRateWhenHumanCorrect: correctRounds ? winsWhenCorrect / correctRounds : 0,
      aiCorrectRate: aiCorrect / rounds,
      aiP10: quantile(aiTimes, 0.1),
      aiMedian: quantile(aiTimes, 0.5),
      aiP90: quantile(aiTimes, 0.9),
    };
  });
}
