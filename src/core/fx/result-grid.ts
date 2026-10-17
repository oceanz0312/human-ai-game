/**
 * Core share kit · Wordle-style result grid. One square per level: 🟥 human beat the AI, 🟦 AI won,
 * ⬛ nobody got it, ⬜ the AI dropped out / no contest. Plain text, pastes anywhere.
 */
export type LevelOutcome = "human" | "ai" | "none" | "void";

const SQUARE: Record<LevelOutcome, string> = { human: "🟥", ai: "🟦", none: "⬛", void: "⬜" };

export function resultGrid(outcomes: LevelOutcome[], perRow = 10) {
  const rows: string[] = [];
  for (let index = 0; index < outcomes.length; index += perRow) rows.push(outcomes.slice(index, index + perRow).map((outcome) => SQUARE[outcome]).join(""));
  return rows.join("\n");
}

export function resultGridText(input: { title: string; summary: string; outcomes: LevelOutcome[]; url: string }) {
  return [input.title, input.summary, resultGrid(input.outcomes), input.url].filter(Boolean).join("\n");
}

/** Streaks from a level history (oldest first). */
export function streaks(outcomes: Array<{ humanCorrect: boolean; winner: LevelOutcome }>) {
  let combo = 0;
  let streak = 0;
  for (const outcome of outcomes) {
    combo = outcome.humanCorrect ? combo + 1 : 0;
    streak = outcome.winner === "human" ? streak + 1 : 0;
  }
  return { combo, streak };
}
