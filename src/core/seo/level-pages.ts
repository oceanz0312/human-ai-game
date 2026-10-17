import type { LevelTier } from "@/seo/level-tier";

/**
 * Core SEO · per-level page provider. The level page template (/games/[game]/levels/[n]) is game-agnostic;
 * a game opts in by registering a provider that maps a level number to its thumbnail, tier and copy vars.
 */
export interface LevelSeoPage {
  level: number;
  imageUrl: string;
  tier: LevelTier;
  vars: Record<string, string>;
}

export interface LevelSeoProvider {
  levels: number;
  page(level: number): LevelSeoPage | null;
  /** Only index levels with enough real samples (thin-content guard). */
  statsGated: boolean;
}
