import { seededRandom } from "@/models/adapters/simulated";
import { spritesFor, type QuickTheme, type Sprite } from "./sprites";

export interface QuickPuzzle {
  seed: string;
  grid: number;
  base: Sprite;
  odd: Sprite;
  /** 0-based cell index of the odd one. */
  oddIndex: number;
  /** Pixels that differ, for the answer key. */
  changed: Array<{ x: number; y: number }>;
}

/**
 * Deterministic puzzle: one sprite repeated grid×grid times, one copy with `changes` pixels recoloured.
 * Same seed → same puzzle, so the server-rendered board and the hydrated one match.
 */
export function makePuzzle(seed: string, opts: { theme: QuickTheme; grid: number; changes: number }): QuickPuzzle {
  const random = seededRandom(seed);
  const sprites = spritesFor(opts.theme);
  const base = sprites[Math.floor(random() * sprites.length)];
  const colours = Object.keys(base.palette);
  const rows = base.rows.map((row) => row.split(""));
  const changed: QuickPuzzle["changed"] = [];
  let guard = 0;
  while (changed.length < opts.changes && guard++ < 200) {
    const x = Math.floor(random() * 8);
    const y = Math.floor(random() * 8);
    if (changed.some((p) => p.x === x && p.y === y)) continue;
    const current = rows[y][x];
    // Prefer recolouring painted pixels; occasionally add or remove one at the edge of the shape.
    const neighbours = [rows[y - 1]?.[x], rows[y + 1]?.[x], rows[y]?.[x - 1], rows[y]?.[x + 1]].filter((c) => c && c !== ".");
    if (current === "." && neighbours.length === 0) continue;
    const options = current === "." ? colours : [...colours.filter((c) => c !== current), "."];
    rows[y][x] = options[Math.floor(random() * options.length)];
    changed.push({ x, y });
  }
  const odd: Sprite = { ...base, id: `${base.id}-odd`, rows: rows.map((row) => row.join("")) };
  return { seed, grid: opts.grid, base, odd, oddIndex: Math.floor(random() * opts.grid * opts.grid), changed };
}

export interface QuickMode {
  key: string;
  theme: QuickTheme;
  /** Grid size per round. */
  grids: number[];
  /** Changed pixels in the odd cell (fewer = harder). */
  changes: number;
  /** Seconds per round. */
  limitS: number;
  /** Maps to a level of the 20-level set for the simulated AI's skill (1 = easiest). */
  aiLevel: number;
}

export const QUICK_MODES = {
  home: { key: "home", theme: "everyday", grids: [4, 5, 6], changes: 2, limitS: 20, aiLevel: 8 },
  easy: { key: "easy", theme: "everyday", grids: [3, 4, 4], changes: 4, limitS: 25, aiLevel: 3 },
  hard: { key: "hard", theme: "everyday", grids: [6, 7, 8], changes: 1, limitS: 20, aiLevel: 16 },
  kids: { key: "kids", theme: "everyday", grids: [3, 3, 4], changes: 5, limitS: 40, aiLevel: 1 },
  christmas: { key: "christmas", theme: "christmas", grids: [4, 5, 6], changes: 2, limitS: 20, aiLevel: 8 },
  game: { key: "game", theme: "everyday", grids: [5, 6, 7], changes: 2, limitS: 18, aiLevel: 12 },
  find: { key: "find", theme: "everyday", grids: [4, 6, 8], changes: 2, limitS: 22, aiLevel: 10 },
} satisfies Record<string, QuickMode>;
export type QuickModeKey = keyof typeof QUICK_MODES;
