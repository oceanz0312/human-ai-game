import { z } from "zod";

export const startSessionSchema = z.object({
  nickname: z.string().trim().min(1).max(24).optional(),
  /** Opponent model id/slug from the registry (resolved server-side to a live model). */
  ai: z.string().regex(/^[a-z0-9-]{1,32}$/).optional(),
  /** SHA-256 browser fingerprint for the daily play limit (hash only). */
  fp: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const submitRoundSchema = z.object({
  /** Opaque, game-defined answer id; the game plugin validates it. */
  choice: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).nullable(),
  elapsedMs: z.number().int().min(0).max(60_000),
});

export const nicknameSchema = z.object({ nickname: z.string().trim().min(1).max(24) });

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
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const analyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  sessionId: z.string().uuid().nullable().optional(),
  level: z.number().int().min(1).max(500).nullable().optional(),
  clientTs: z.number().int().positive(),
  metadata: z
    .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine((value) => value === undefined || JSON.stringify(value).length <= 2048, "metadata too large"),
});
