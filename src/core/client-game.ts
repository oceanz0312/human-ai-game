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

/** Minimal reveal payload the core shell reads; games add their own fields. */
export interface RevealRound {
  id: string;
  level: number;
  correctChoice: string | null;
  human: { status: string; choice: string | null; elapsedMs: number } | null;
  ai: { status: string; correct: boolean | null; choice: string | null; elapsedMs: number | null; probabilities: Record<string, number> | null };
  winner: string;
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
  /** Reveal board: same size and position as the play board. Must mark answer elements with `data-answer`. */
  RevealBoard: ComponentType<{ round: RevealRound }>;
  /** Where 退出 leads (the game's landing page). */
  exitPath: string;
  /** Game name for the breadcrumb (translated). */
  title(t: (id: string, vars?: Record<string, string | number>) => string): string;
  /** Board thumbnail for the single-level share card. */
  cardImage(round: RevealRound): string | null;
  /** Short in-play hint under the board (already translated). */
  hint(level: PL | undefined, t: (id: string, vars?: Record<string, string | number>) => string): string;
}

/** What the core reveal shell needs from a game (independent of the level type). */
export type RevealShellGame = Pick<ClientGamePlugin<never>, "RevealBoard" | "cardImage">;
