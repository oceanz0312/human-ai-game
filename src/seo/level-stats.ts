import "server-only";
import { cache } from "react";
import { getGameService } from "@/server/container";
import type { LevelStatsRow } from "@/server/repositories/game-repository";

/** A level page is indexable only with enough real runs to carry unique data (scaled-content guard). */
export const MIN_INDEXABLE_SAMPLES = 30;

/** Per-request memo: a level page's generateMetadata and body share one aggregate query. */
export const loadLevelStats = cache(async function loadLevelStats(): Promise<Map<number, LevelStatsRow>> {
  try {
    const rows = await (await getGameService()).getLevelStats();
    return new Map(rows.map((row) => [row.level, row]));
  } catch {
    return new Map();
  }
});

export const isIndexableLevel = (row: LevelStatsRow | undefined) => (row?.samples ?? 0) >= MIN_INDEXABLE_SAMPLES;
export const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
export const seconds = (ms: number | null) => (ms == null ? "—" : `${(ms / 1000).toFixed(2)}s`);
