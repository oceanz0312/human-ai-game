import { z } from "zod";

export const startSessionSchema = z.object({ nickname: z.string().trim().min(1).max(24).optional() });

export const submitRoundSchema = z.object({
  choice: z.string().regex(/^r[1-9]c[1-9]$/).nullable(),
  elapsedMs: z.number().int().min(0).max(60_000),
});

export const nicknameSchema = z.object({ nickname: z.string().trim().min(1).max(24) });

export const ANALYTICS_EVENTS = [
  "game_start",
  "level_shown",
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
  level: z.number().int().min(1).max(20).nullable().optional(),
  clientTs: z.number().int().positive(),
  metadata: z
    .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine((value) => value === undefined || JSON.stringify(value).length <= 2048, "metadata too large"),
});
