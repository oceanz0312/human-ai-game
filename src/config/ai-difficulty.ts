import * as z from "zod/mini";
import type { SimBandParams } from "@/models/adapters/sim-sampler";

/**
 * Difficulty curve of the in-game simulated AI (formal 20-level runs). Server-side only: the browser never needs it.
 *
 * Tuning: edit the numbers here, run `npx tsx scripts/sim-difficulty.ts` (replays real human reaction times against
 * the curve, 10k+ rounds per band), keep tests/unit/sim-difficulty.test.ts green, deploy. For a quick experiment
 * without a code change, set SIM_AI_DIFFICULTY_JSON (same shape, any subset of keys) on the Worker; an invalid value
 * is ignored with a warning and these defaults apply. SIM_AI_CURVE=v1 restores the pre-2026-10-18 curve.
 *
 * Targets (human round-win rate, approved 2026-10-18): levels 1–5 the human wins easily (~60%; capped by how often
 * people solve these levels at all, ~60% measured), 6–14 contested (30–40%), 15–20 the AI dominates (5–10%).
 * A full 20-level run lands at 25–35% overall; the AI "gets brutal" (first level < 20%) at level 15.
 */
export const SIM_AI_VERSION = "sim-v2";

export interface SimBand extends SimBandParams {
  fromLevel: number;
  toLevel: number;
}

export interface FormalDifficulty {
  bands: SimBand[];
  /** The AI always answers before this fraction of the level clock. */
  maxFractionOfLimit: number;
  /** Per-level tweaks on top of the band, e.g. { "8": { "accuracy": 0.6 } }. */
  levelOverrides: Record<string, Partial<SimBandParams>>;
}

const NO_SNAP = { chance: 0, minMs: 0, maxMs: 0 };

export const FORMAL_DIFFICULTY: FormalDifficulty = {
  bands: [
    {
      // Warm-up: slow and error-prone — a player who spots it almost always wins.
      fromLevel: 1,
      toLevel: 5,
      accuracy: 0.45,
      medianMs: 3200,
      spread: 0.3,
      minMs: 1800,
      snap: NO_SNAP,
      hesitate: { chance: 0.2, minMs: 800, maxMs: 2000 },
    },
    {
      // Contested (9×9 grids begin): about as fast as a sharp player, rarely wrong.
      fromLevel: 6,
      toLevel: 10,
      accuracy: 0.88,
      medianMs: 1150,
      spread: 0.35,
      minMs: 500,
      snap: { chance: 0.05, minMs: 250, maxMs: 450 },
      hesitate: { chance: 0.1, minMs: 600, maxMs: 1500 },
    },
    {
      // Contested, trickier pictures: slower than 6–10 but still a race.
      fromLevel: 11,
      toLevel: 14,
      accuracy: 0.8,
      medianMs: 1600,
      spread: 0.35,
      minMs: 600,
      snap: { chance: 0.05, minMs: 250, maxMs: 450 },
      hesitate: { chance: 0.1, minMs: 600, maxMs: 1500 },
    },
    {
      // Brutal: a fast vision model (JEV-like snaps). Humans win mostly when it slips or hesitates.
      fromLevel: 15,
      toLevel: 20,
      accuracy: 0.93,
      medianMs: 550,
      spread: 0.4,
      minMs: 250,
      snap: { chance: 0.2, minMs: 150, maxMs: 350 },
      hesitate: { chance: 0.06, minMs: 500, maxMs: 1200 },
    },
  ],
  maxFractionOfLimit: 0.9,
  // Level 8 (未/末) is one most players miss: a shakier AI keeps it contested.
  levelOverrides: { "8": { accuracy: 0.5 } },
};

const probability = z.number().check(z.minimum(0), z.maximum(1));
const ms = z.number().check(z.minimum(0), z.maximum(60_000));
const range = z.object({ chance: probability, minMs: ms, maxMs: ms }).check(z.refine((r) => r.maxMs >= r.minMs, "maxMs < minMs"));
const bandParams = { accuracy: probability, medianMs: z.number().check(z.minimum(1), z.maximum(60_000)), spread: z.number().check(z.minimum(0), z.maximum(2)), minMs: ms, snap: range, hesitate: range };
const bandSchema = z.object({ fromLevel: z.int().check(z.minimum(1)), toLevel: z.int().check(z.minimum(1)), ...bandParams });
const overrideSchema = z.partial(z.object(bandParams));

export const formalDifficultySchema = z.object({
  bands: z.array(bandSchema).check(z.minLength(1)),
  maxFractionOfLimit: z.number().check(z.minimum(0.1), z.maximum(0.99)),
  levelOverrides: z.record(z.string().check(z.regex(/^\d+$/)), overrideSchema),
});

/** Bands must be sorted, contiguous and cover 1..totalLevels exactly once. */
export function bandsCoverLevels(bands: SimBand[], totalLevels: number) {
  let expected = 1;
  for (const band of bands) {
    if (band.fromLevel !== expected || band.toLevel < band.fromLevel) return false;
    expected = band.toLevel + 1;
  }
  return expected === totalLevels + 1;
}

/**
 * Defaults merged with an optional JSON override (SIM_AI_DIFFICULTY_JSON). Any problem → defaults + a warning;
 * the game never breaks because of a typo in an env var.
 */
export function resolveFormalDifficulty(json: string | undefined | null, totalLevels = 20, warn: (message: string) => void = console.warn): FormalDifficulty {
  if (!json || !json.trim()) return FORMAL_DIFFICULTY;
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("not an object");
    const merged = { ...FORMAL_DIFFICULTY, ...(raw as Record<string, unknown>) };
    const parsed = formalDifficultySchema.safeParse(merged);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    if (!bandsCoverLevels(parsed.data.bands, totalLevels)) throw new Error(`bands must cover levels 1..${totalLevels} contiguously`);
    return parsed.data as FormalDifficulty;
  } catch (error) {
    warn(`[sim-ai] SIM_AI_DIFFICULTY_JSON ignored (${error instanceof Error ? error.message : "invalid"}); using ${SIM_AI_VERSION} defaults`);
    return FORMAL_DIFFICULTY;
  }
}

/** Band parameters for one level, with its per-level override applied. */
export function bandForLevel(config: FormalDifficulty, level: number): SimBandParams {
  const band = config.bands.find((item) => level >= item.fromLevel && level <= item.toLevel) ?? config.bands[config.bands.length - 1];
  const override = config.levelOverrides[String(level)] ?? {};
  return { ...band, ...override };
}

export type SimAiCurve = "v1" | "v2";
export const resolveSimAiCurve = (value: string | undefined | null): SimAiCurve => (value === "v1" ? "v1" : "v2");
