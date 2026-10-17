import type { ComponentType } from "react";

/**
 * Client half of the game plugin. The core game screen (race orchestration, HUD, AI terminal,
 * danmaku, lock-in/waiting, reveal shell, FX) renders whatever board the plugin provides and only
 * ever passes opaque answer ids back to the server.
 */
export interface CorePublicLevel {
  level: number;
  limitMs: number;
}

export interface BoardRenderProps<PL extends CorePublicLevel> {
  level: PL;
  /** Assets loaded: the board may paint. */
  ready: boolean;
  disabled: boolean;
  selected: string | null;
  loadingLabel?: string | null;
  onChoose: (answer: string) => void;
  /** Call once the level is actually visible (starts both clocks and the server-side AI). */
  onPainted?: () => void;
}

export interface ClientGamePlugin<PL extends CorePublicLevel = CorePublicLevel> {
  slug: string;
  totalLevels: number;
  startingChances: number;
  /** Public (answer-free) level metadata, for limits and asset prefetch before the server responds. */
  publicLevel(level: number): PL | undefined;
  /** Static assets to preload for a level (images, audio…). */
  assetUrls(level: PL): string[];
  Board: ComponentType<BoardRenderProps<PL>>;
  /** Short in-play hint under the board (already translated). */
  hint(level: PL | undefined, t: (id: string, vars?: Record<string, string | number>) => string): string;
}
