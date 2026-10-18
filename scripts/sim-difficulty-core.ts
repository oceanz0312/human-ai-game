import { bandForLevel, type FormalDifficulty } from "../src/config/ai-difficulty";
import { resolveRace } from "../src/game/rules";
import { planSimulatedAnswer } from "../src/models/adapters/simulated";
import { seededRandom } from "../src/models/adapters/sim-sampler";
import { LEVELS_V1 } from "../src/server/levels/spec";
import data from "./data/human-reaction-v1.json";

export interface SimRow {
  label: string;
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
const TOTAL = LEVELS_V1.length;
/** Human data pools: per-level samples are thin, so reaction times are pooled by grid/difficulty group. */
const POOLS: [number, number][] = [
  [1, 5],
  [6, 10],
  [11, 20],
];
/** A level's own human solve rate needs this many rounds; otherwise its pool's rate is used. */
const MIN_LEVEL_ROUNDS = 10;

function humanModel(level: number) {
  const [from, to] = POOLS.find(([a, b]) => level >= a && level <= b)!;
  let rounds = 0;
  let correct = 0;
  const times: number[] = [];
  for (let l = from; l <= to; l++) {
    const row = levels[String(l)];
    if (!row) continue;
    rounds += row.rounds;
    correct += row.humanCorrect;
    times.push(...row.correctMs);
  }
  const own = levels[String(level)];
  const correctRate = own && own.rounds >= MIN_LEVEL_ROUNDS ? own.humanCorrect / own.rounds : rounds ? correct / rounds : 0.6;
  return { correctRate, times };
}

/** Replays real human outcomes against the curve with the real race rules, for one level. Deterministic. */
export function simulateLevel(config: FormalDifficulty, level: number, rounds: number, seed: string): SimRow {
  const random = seededRandom(`${seed}|L${level}`);
  const human = humanModel(level);
  const choices = Array.from({ length: 81 }, (_, i) => `c${i}`);
  const spec = LEVELS_V1[level - 1];
  let wins = 0;
  let correctRounds = 0;
  let winsWhenCorrect = 0;
  let aiCorrect = 0;
  const aiTimes: number[] = [];
  for (let i = 0; i < rounds; i++) {
    const plan = planSimulatedAnswer({ level, totalLevels: TOTAL, limitMs: spec.limitMs, correctChoice: "c0", seed: `${seed}-${level}-${i}` }, choices, bandForLevel(config, level), config.maxFractionOfLimit);
    const humanCorrect = random() < human.correctRate;
    const humanMs = human.times[Math.floor(random() * human.times.length)];
    const { winner } = resolveRace({ humanCorrect, humanElapsedMs: humanMs, aiStatus: "complete", aiCorrect: plan.correct, aiElapsedMs: plan.thinkMs });
    if (plan.correct) aiCorrect++;
    aiTimes.push(plan.thinkMs);
    if (winner === "human") wins++;
    if (humanCorrect) {
      correctRounds++;
      if (winner === "human") winsWhenCorrect++;
    }
  }
  aiTimes.sort((a, b) => a - b);
  return {
    label: String(level),
    rounds,
    humanWinRate: wins / rounds,
    winRateWhenHumanCorrect: correctRounds ? winsWhenCorrect / correctRounds : 0,
    aiCorrectRate: aiCorrect / rounds,
    aiP10: quantile(aiTimes, 0.1),
    aiMedian: quantile(aiTimes, 0.5),
    aiP90: quantile(aiTimes, 0.9),
  };
}

function merge(label: string, rows: SimRow[]): SimRow {
  const rounds = rows.reduce((sum, row) => sum + row.rounds, 0);
  const avg = (pick: (row: SimRow) => number) => rows.reduce((sum, row) => sum + pick(row) * row.rounds, 0) / rounds;
  return {
    label,
    rounds,
    humanWinRate: avg((row) => row.humanWinRate),
    winRateWhenHumanCorrect: avg((row) => row.winRateWhenHumanCorrect),
    aiCorrectRate: avg((row) => row.aiCorrectRate),
    aiP10: Math.round(avg((row) => row.aiP10)),
    aiMedian: Math.round(avg((row) => row.aiMedian)),
    aiP90: Math.round(avg((row) => row.aiP90)),
  };
}

/**
 * Per level, per config band (≥ roundsPerBand rounds each), and the overall rate of a full 20-level run
 * (every level counted once). `reachWeighted` weights levels by how often they are actually played today.
 */
export function simulateCurve(config: FormalDifficulty, roundsPerBand = 12_000, seed = "sim") {
  const perLevel: SimRow[] = [];
  const bands = config.bands.map((band) => {
    const size = band.toLevel - band.fromLevel + 1;
    const rows: SimRow[] = [];
    for (let level = band.fromLevel; level <= band.toLevel; level++) rows.push(simulateLevel(config, level, Math.ceil(roundsPerBand / size), seed));
    perLevel.push(...rows);
    return merge(`${band.fromLevel}-${band.toLevel}`, rows);
  });
  const fullRun = perLevel.reduce((sum, row) => sum + row.humanWinRate, 0) / perLevel.length;
  const played = perLevel.map((row) => levels[row.label]?.rounds ?? 0);
  const playedTotal = played.reduce((a, b) => a + b, 0);
  const reachWeighted = perLevel.reduce((sum, row, i) => sum + row.humanWinRate * played[i], 0) / playedTotal;
  const brutalFrom = perLevel.find((row) => row.humanWinRate < 0.2)?.label ?? null;
  return { perLevel, bands, fullRun, reachWeighted, brutalFrom: brutalFrom === null ? null : Number(brutalFrom) };
}
