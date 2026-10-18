import * as z from "zod/mini";

/**
 * Wire contract shared by the game service and the Cloudflare Worker. This module must stay free
 * of `server-only` and Node APIs so the Worker bundle can import it, and client components must
 * never import it.
 */

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const DECISION_ERROR_CODES = [
  "unauthorized",
  "invalid_request",
  "payload_too_large",
  "refused",
  "invalid_choice",
  "invalid_response",
  "rate_limited",
  "upstream_error",
  "upstream_timeout",
  "network_error",
  "region_unsupported",
  "level_image_unavailable",
  "worker_unavailable",
  "ai_unconfigured",
  "ai_timeout",
  "ticket_invalid",
  "ticket_expired",
  "ticket_replayed",
  "ticket_tampered",
] as const;
export type DecisionErrorCode = (typeof DECISION_ERROR_CODES)[number];

/** Answers are opaque, game-defined ids (e.g. "r2c2"). */
const choiceValue = z.string().check(z.regex(/^[A-Za-z0-9_-]{1,64}$/));

/** Normalized AI task built by the game plugin; adapters translate it to their wire format. */
export const decisionTaskSchema = z.object({
  name: z.string().check(z.regex(/^[a-z][a-z0-9_]{0,40}$/)),
  instructions: z.string().check(z.minLength(1), z.maxLength(4000)),
  choices: z.array(z.object({ value: choiceValue, description: z.string().check(z.maxLength(200)) })).check(z.minLength(2), z.maxLength(100)),
});
export type DecisionTask = z.infer<typeof decisionTaskSchema>;

export const decisionRequestSchema = z
  .object({
    imageDataUrl: z.string().check(z.regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/)),
    choices: z.array(choiceValue).check(z.minLength(2), z.maxLength(100)),
    /** Optional so older Decisions Worker builds (which strip it) fall back to the spot-the-difference prompt. */
    task: z.optional(decisionTaskSchema),
  })
  .check(
    z.refine((value) => new Set(value.choices).size === value.choices.length, { message: "choices must be unique" }),
    z.refine((value) => !value.task || value.task.choices.every((choice) => value.choices.includes(choice.value)), { message: "task choices must match" }),
  );

export type DecisionInput = z.infer<typeof decisionRequestSchema>;

export const workerDecisionResponseSchema = z.object({
  status: z.enum(["complete", "error"]),
  choice: z.nullable(choiceValue),
  confidence: z.nullable(z.number().check(z.minimum(0), z.maximum(1))),
  probabilities: z.record(z.string(), z.number()),
  modelElapsedMs: z.int().check(z.minimum(0)),
  errorCode: z.nullable(z.enum(DECISION_ERROR_CODES)),
  /** Sanitized OpenAI HTTP context for operator debugging (no secrets). */
  detail: z.optional(z.nullable(z.string().check(z.maxLength(512)))),
  requestId: z.string().check(z.maxLength(80)),
});

export type WorkerDecisionResponse = z.infer<typeof workerDecisionResponseSchema>;

export interface DecisionResult extends WorkerDecisionResponse {
  /** End-to-end game service → Worker → OpenAI → Worker → game service duration. */
  elapsedMs: number;
}

export interface DecisionClient {
  decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult>;
}

/** Browser-visible Decisions Worker response: no choice or probabilities (authoritative data lives on the game service). */
export const browserDecisionResponseSchema = z.object({
  status: z.enum(["complete", "error"]),
  requestId: z.string().check(z.maxLength(80)),
  modelElapsedMs: z.int().check(z.minimum(0)),
  imageLoadMs: z.optional(z.int().check(z.minimum(0))),
  errorCode: z.nullable(z.enum(DECISION_ERROR_CODES)),
  receivedAt: z.int().check(z.positive()),
});

export type BrowserDecisionResponse = z.infer<typeof browserDecisionResponseSchema>;

export const publicDecideRequestSchema = z.object({
  ticket: z.string().check(z.minLength(32), z.maxLength(8192)),
});

export type PublicDecideRequest = z.infer<typeof publicDecideRequestSchema>;

/** Service-binding request: Decisions Worker → game service OpenAI proxy (Bearer shared secret). */
export const internalOpenAiDecideRequestSchema = z.extend(decisionRequestSchema, {
  requestId: z.string().check(z.maxLength(80)),
});

export type InternalOpenAiDecideRequest = z.infer<typeof internalOpenAiDecideRequestSchema>;

export const workerAiResultReportSchema = z.object({
  roundId: z.string().check(z.minLength(8)),
  jti: z.uuid(),
  result: workerDecisionResponseSchema,
  wallElapsedMs: z.optional(z.int().check(z.minimum(0))),
});

export type WorkerAiResultReport = z.infer<typeof workerAiResultReportSchema>;

export { buildOddCellInstructions, gridSizeFromChoices } from "../../models/tasks/spot-the-difference";
