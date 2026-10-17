/**
 * Model layer types. A "model" is an AI opponent a human can play against. Everything the game, the
 * opponent-select screen, the leaderboards and the /ai-opponents pages know about an opponent comes
 * from one ModelEntry in src/models/registry.ts.
 *
 * This module is pure data/types: safe for client components, the game Worker and the Decisions Worker.
 */

/** Which adapter talks to the model's API. Only "openai-decisions" is wired to a live endpoint. */
export type ModelAdapterKind = "openai-decisions" | "openai-compatible-chat" | "cloudflare-workers-ai";

export type ModelStatus = "live" | "coming-soon";

/** Task types a model can be asked to solve. Each game builds one of these via src/models/tasks/. */
export type ModelTaskKind = "vision-single-choice";

export interface ModelCapabilities {
  /** Accepts an image input. */
  vision: boolean;
  /** Returns one choice from a closed candidate set. */
  singleChoice: boolean;
  /** Returns per-candidate probabilities / confidence. */
  probabilities: boolean;
}

export interface ModelEntry {
  /** Stable id stored in D1 (`model_id`). Never rename once live. */
  id: string;
  /** Neutral URL slug for /ai-opponents/<slug> and `?ai=`. No third-party brand names. */
  slug: string;
  /** Public name shown in UI (e.g. "Luna"). */
  publicName: string;
  provider: string;
  /** API surface used, shown on the opponent page. */
  api: string;
  /** Upstream model identifier (honest identity). Coming-soon entries may be tentative. */
  upstreamModel: string;
  status: ModelStatus;
  adapter: ModelAdapterKind;
  capabilities: ModelCapabilities;
  tasks: ModelTaskKind[];
  /** Game slugs this model can be selected for. */
  games: string[];
  /** Pixel avatar accent colour (CSS colour). */
  accent: string;
}

/** A vision single-choice question, provider-agnostic. Adapters translate it to their wire format. */
export interface VisionChoiceTask {
  kind: "vision-single-choice";
  /** Name of the answer field (used by structured-output APIs). */
  name: string;
  imageDataUrl: string;
  instructions: string;
  choices: Array<{ value: string; description: string }>;
}
