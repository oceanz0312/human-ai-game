/** Prints expected human win rates per level / band for the current (or SIM_AI_DIFFICULTY_JSON-overridden) curve. */
import { resolveFormalDifficulty } from "../src/config/ai-difficulty";
import { simulateCurve } from "./sim-difficulty-core";

const config = resolveFormalDifficulty(process.env.SIM_AI_DIFFICULTY_JSON);
const result = simulateCurve(config, Number(process.env.SIM_ROUNDS ?? 20_000), process.env.SIM_SEED ?? "sim");
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const show = (rows: typeof result.bands) =>
  console.table(rows.map((row) => ({ levels: row.label, rounds: row.rounds, humanWin: pct(row.humanWinRate), winWhenHumanCorrect: pct(row.winRateWhenHumanCorrect), aiCorrect: pct(row.aiCorrectRate), "aiMs p10/p50/p90": `${row.aiP10} / ${row.aiMedian} / ${row.aiP90}` })));
show(result.perLevel);
show(result.bands);
console.log(`full 20-level run (each level once): ${pct(result.fullRun)}`);
console.log(`weighted by levels actually played so far: ${pct(result.reachWeighted)}`);
console.log(`AI gets brutal (first level with human win < 20%): level ${result.brutalFrom}`);
