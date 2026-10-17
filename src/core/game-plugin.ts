import type { DecisionInput } from "../server/decisions/contracts";

/**
 * Game-agnostic core ↔ per-game plugin contract (server side).
 *
 * The core owns everything that is the same for every "human vs real AI" game: sessions, rounds,
 * chances, the server-initiated AI race (hidden answer, lock-in, waiting, timing), the AI event
 * stream, daily play limit, leaderboards, model registry, share/result grid and SEO templates.
 *
 * A game only supplies what is genuinely game-specific:
 *   - level data / content            → levels(), getLevel(), toPublicLevel()
 *   - judging an answer               → isValidAnswer(), judge(), correctAnswer()
 *   - the normalized task for the AI  → buildDecisionInput()
 *   - reveal payload for its board    → revealFields()
 *   - (client) board + input, copy & SEO live in src/games/<slug>/ (see docs/adding-a-game.md)
 *
 * Answers are opaque strings to the core (e.g. "r2c2" for a grid cell). The core never interprets them.
 */
export interface CoreLevel {
  level: number;
  /** Same time limit for the human and the AI. */
  limitMs: number;
}

export interface GamePlugin<L extends CoreLevel = CoreLevel, PublicLevel = unknown, RevealFields extends object = object> {
  slug: string;
  /** Frozen level-set id; a new set means a new leaderboard. */
  levelSetVersion: string;
  totalLevels: number;
  startingChances: number;
  levels(): L[];
  getLevel(level: number): L;
  /** What the browser gets before answering. Must never contain the answer. */
  toPublicLevel(level: L): PublicLevel;
  /** The closed answer space for a level (opaque ids). */
  choices(level: L): string[];
  /** Closed answer space check (human and AI). */
  isValidAnswer(level: L, answer: string): boolean;
  judge(level: L, answer: string): boolean;
  /** Revealed only after the human locked in. */
  correctAnswer(level: L): string;
  /** Extra reveal fields the game's board needs (e.g. grid size, image). */
  revealFields(level: L): RevealFields;
  /** Normalized decision input for the AI. Every model gets the same task (fairness). */
  buildDecisionInput(level: L): Promise<DecisionInput>;
}

export type AnyGamePlugin = GamePlugin<CoreLevel, unknown, object>;

/** Small registry so the core can serve several games (one service per plugin, resolved by slug). */
export function createPluginRegistry(plugins: AnyGamePlugin[]) {
  const bySlug = new Map(plugins.map((plugin) => [plugin.slug, plugin]));
  if (bySlug.size !== plugins.length) throw new Error("duplicate game plugin slug");
  return {
    get(slug: string) {
      const plugin = bySlug.get(slug);
      if (!plugin) throw new Error(`unknown game plugin: ${slug}`);
      return plugin;
    },
    has: (slug: string) => bySlug.has(slug),
    slugs: () => [...bySlug.keys()],
  };
}
