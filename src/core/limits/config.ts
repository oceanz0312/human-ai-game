/**
 * Daily play limit (game-agnostic). A "play" is one full run (a session started).
 * scope "global": one budget across all games; "per-game": a budget per game slug.
 */
export interface PlayLimitConfig {
  runsPerDay: number;
  scope: "global" | "per-game";
}

export const PLAY_LIMIT_DEFAULTS: PlayLimitConfig = { runsPerDay: 3, scope: "per-game" };

/** Env overrides: PLAY_LIMIT_RUNS_PER_DAY (0 disables), PLAY_LIMIT_SCOPE. */
export function readPlayLimitConfig(env: Record<string, string | undefined> = process.env): PlayLimitConfig {
  const runs = Number(env.PLAY_LIMIT_RUNS_PER_DAY);
  const scope = env.PLAY_LIMIT_SCOPE === "global" ? "global" : env.PLAY_LIMIT_SCOPE === "per-game" ? "per-game" : PLAY_LIMIT_DEFAULTS.scope;
  return { runsPerDay: Number.isFinite(runs) && env.PLAY_LIMIT_RUNS_PER_DAY !== undefined && env.PLAY_LIMIT_RUNS_PER_DAY !== "" ? Math.max(0, Math.floor(runs)) : PLAY_LIMIT_DEFAULTS.runsPerDay, scope };
}

/** UTC day key, e.g. "2026-10-18". Resets at 00:00 UTC; the UI shows that instant in the player's local time. */
export const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);
export const nextUtcMidnight = (now: number) => {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};

export const scopeKey = (config: PlayLimitConfig, game: string) => (config.scope === "global" ? "*" : game);

/** Public status returned to the browser. */
export interface PlayLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  /** Epoch ms of the next reset (00:00 UTC). */
  resetAt: number;
  /** True when this request carries a valid test bypass (never shown to players). */
  bypass?: boolean;
}
