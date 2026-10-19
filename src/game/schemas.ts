import * as z from "zod/mini";

export const startSessionSchema = z.object({
  nickname: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(24))),
  /** Opponent model id/slug from the registry (resolved server-side to a live model). */
  ai: z.optional(z.string().check(z.regex(/^[a-z0-9-]{1,32}$/))),
  /** Random per-browser player key (crypto.randomUUID in localStorage) for the daily play limit; stored hashed. */
  pk: z.uuid(),
});

export const submitRoundSchema = z.object({
  /** Opaque, game-defined answer id; the game plugin validates it. */
  choice: z.nullable(z.string().check(z.regex(/^[A-Za-z0-9_-]{1,64}$/))),
  elapsedMs: z.int().check(z.minimum(0), z.maximum(60_000)),
});

export const nicknameSchema = z.object({ nickname: z.string().check(z.trim(), z.minLength(1), z.maxLength(24)) });

export const ANALYTICS_EVENTS = [
  "game_start",
  "level_shown",
  "ai_dispatch_complete",
  "ai_dispatch_failed",
  "player_answered",
  "ai_answered",
  "level_result",
  "run_end",
  "replay",
  "poster_generated",
  "share_completed",
  "share_landing_started",
  "quick_round",
  // Home hero (plan "Approved v2"): primary CTA, demo overlay and in-place board starts.
  "hero_cta_click",
  "demo_view",
  "demo_skip",
  "board_start",
  // Keyword pages: the secondary 20-level CTA under the themed board.
  "kw_cta_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const analyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  sessionId: z.optional(z.nullable(z.uuid())),
  level: z.optional(z.nullable(z.int().check(z.minimum(1), z.maximum(500)))),
  clientTs: z.int().check(z.positive()),
  metadata: z
    .optional(z.record(z.string().check(z.maxLength(40)), z.union([z.string().check(z.maxLength(200)), z.number(), z.boolean(), z.null()])))
    .check(z.refine((value) => value === undefined || JSON.stringify(value).length <= 2048, "metadata too large")),
});
