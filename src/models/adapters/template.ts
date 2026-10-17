import type { DecisionClient, DecisionResult } from "../../server/decisions/contracts";
import type { ModelAdapterKind, ModelEntry, VisionChoiceTask } from "../types";

/**
 * Config template per adapter kind: which env vars a deployment needs before a model may go live.
 * Values are never stored here; secrets stay in Worker secrets.
 */
export interface ModelConfigTemplate {
  adapter: ModelAdapterKind;
  /** Secret env var names (wrangler secret put). */
  secrets: string[];
  /** Plain env var names with defaults. */
  vars: Record<string, string>;
  /** How the VisionChoiceTask is expressed on the wire. */
  wireFormat: string;
}

export const configTemplates: Record<ModelAdapterKind, ModelConfigTemplate> = {
  "openai-decisions": {
    adapter: "openai-decisions",
    secrets: ["OPENAI_API_KEY"],
    vars: { OPENAI_BASE_URL: "https://api.openai.com/v1", OPENAI_DECISIONS_MODEL: "gpt-6-luna", OPENAI_DECISIONS_TIMEOUT_MS: "8000" },
    wireFormat: "POST /v1/decisions · questions[type=choice] → answers[choice, confidence, probabilities]",
  },
  "openai-compatible-chat": {
    adapter: "openai-compatible-chat",
    secrets: ["<MODEL>_API_KEY"],
    vars: { "<MODEL>_BASE_URL": "", "<MODEL>_MODEL": "", "<MODEL>_TIMEOUT_MS": "8000" },
    wireFormat: "POST /chat/completions · image_url + JSON schema {choice: enum(choices)}",
  },
  "cloudflare-workers-ai": {
    adapter: "cloudflare-workers-ai",
    secrets: [],
    vars: { "<MODEL>_WORKERS_AI_MODEL": "", "<MODEL>_LORA": "" },
    wireFormat: "env.AI.run(model, {image, prompt, response_format: json_schema})",
  },
};

/**
 * Scaffold for a not-yet-live adapter. It NEVER performs a network call: every decide() resolves to
 * `ai_unconfigured`. To ship a model, replace this with a real adapter, add tests with a mocked fetch,
 * then flip the registry entry to `live`.
 */
export function createScaffoldAdapter(model: ModelEntry): DecisionClient & { toWire(task: VisionChoiceTask): unknown } {
  return {
    toWire(task) {
      return { model: model.upstreamModel, task: task.kind, name: task.name, choices: task.choices.map((choice) => choice.value) };
    },
    async decide(): Promise<DecisionResult> {
      return {
        status: "error",
        choice: null,
        confidence: null,
        probabilities: {},
        modelElapsedMs: 0,
        errorCode: "ai_unconfigured",
        requestId: `scaffold:${model.id}`,
        elapsedMs: 0,
      };
    },
  };
}
