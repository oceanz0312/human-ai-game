export type LevelTier = "easy" | "hard" | "expert";

/**
 * Difficulty band behind the per-level keywords (docs/seo/seo-multilingual-architecture.md):
 * 1–5 are 3×3 warm-ups ("odd one out"), 6–12 are 9×9 "hard spot the difference",
 * 13–20 drop under 4.5 s and are pitched as "expert".
 */
export function levelTier(level: number): LevelTier {
  return level <= 5 ? "easy" : level <= 12 ? "hard" : "expert";
}
