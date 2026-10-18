/** Prints expected human win rates per band for the current (or SIM_AI_DIFFICULTY_JSON-overridden) curve. */
import { resolveFormalDifficulty } from "../src/config/ai-difficulty";
import { simulateBands } from "./sim-difficulty-core";

const config = resolveFormalDifficulty(process.env.SIM_AI_DIFFICULTY_JSON);
const rows = simulateBands(config, Number(process.env.SIM_ROUNDS ?? 20_000), process.env.SIM_SEED ?? "sim");
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
console.table(
  rows.map((row) => ({
    band: row.band,
    rounds: row.rounds,
    humanWin: pct(row.humanWinRate),
    winWhenHumanCorrect: pct(row.winRateWhenHumanCorrect),
    aiCorrect: pct(row.aiCorrectRate),
    aiMs: `${row.aiP10} / ${row.aiMedian} / ${row.aiP90}`,
  })),
);
