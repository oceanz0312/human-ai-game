import { z } from "zod";

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
  "worker_unavailable",
  "ai_unconfigured",
  "ai_timeout",
] as const;
export type DecisionErrorCode = (typeof DECISION_ERROR_CODES)[number];

const choiceValue = z.string().regex(/^r[1-9]c[1-9]$/);

export const decisionRequestSchema = z
  .object({
    imageDataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/),
    choices: z.array(choiceValue),
  })
  .refine((value) => value.choices.length === 9 || value.choices.length === 81, { message: "choices must contain 9 or 81 cells" })
  .refine((value) => new Set(value.choices).size === value.choices.length, { message: "choices must be unique" });

export type DecisionInput = z.infer<typeof decisionRequestSchema>;

export const workerDecisionResponseSchema = z.object({
  status: z.enum(["complete", "error"]),
  choice: choiceValue.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  probabilities: z.record(z.string(), z.number()),
  modelElapsedMs: z.number().int().min(0),
  errorCode: z.enum(DECISION_ERROR_CODES).nullable(),
  requestId: z.string().max(80),
});

export type WorkerDecisionResponse = z.infer<typeof workerDecisionResponseSchema>;

export interface DecisionResult extends WorkerDecisionResponse {
  /** End-to-end game service → Worker → OpenAI → Worker → game service duration. */
  elapsedMs: number;
}

export interface DecisionClient {
  decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult>;
}

export function gridSizeFromChoices(choices: string[]) {
  return choices.length === 81 ? 9 : 3;
}

export function buildOddCellInstructions(gridSize: number) {
  return [
    `The image shows a ${gridSize} by ${gridSize} grid of tiles.`,
    "Every tile contains the same pattern except exactly one tile, which differs in shape, orientation, mirroring, color, shade, a missing or extra part, or a small positional offset.",
    `Rows are numbered 1 to ${gridSize} from top to bottom and columns 1 to ${gridSize} from left to right.`,
    "Which tile is the odd one out?",
  ].join(" ");
}
