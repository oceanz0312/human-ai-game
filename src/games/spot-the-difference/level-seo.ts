import type { LevelSeoProvider } from "@/core/seo/level-pages";
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";
import { levelTier } from "@/seo/level-tier";

export const spotLevelSeo: LevelSeoProvider = {
  levels: PUBLIC_LEVELS_V1.length,
  statsGated: true,
  page(n) {
    const level = PUBLIC_LEVELS_V1[n - 1];
    if (!level) return null;
    return {
      level: level.level,
      imageUrl: level.imageUrl,
      tier: levelTier(level.level),
      vars: { n: String(level.level), grid: String(level.gridSize), secs: String(level.limitMs / 1000), cells: String(level.gridSize ** 2) },
    };
  },
};
