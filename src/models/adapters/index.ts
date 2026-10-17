import type { DecisionClient } from "../../server/decisions/contracts";
import { getModel } from "../registry";
import { createScaffoldAdapter } from "./template";

/**
 * Picks the DecisionClient for a model id. Live OpenAI Decisions models use the provided live client
 * (the proven DECISIONS-binding egress chain); everything else gets a scaffold that never calls out.
 */
export function decisionClientForModel(modelId: string, liveOpenAiDecisions: DecisionClient): DecisionClient {
  const model = getModel(modelId);
  if (model?.status === "live" && model.adapter === "openai-decisions") return liveOpenAiDecisions;
  return createScaffoldAdapter(
    model ?? {
      id: modelId,
      slug: modelId,
      publicName: modelId,
      provider: "unknown",
      api: "unknown",
      upstreamModel: modelId,
      status: "coming-soon",
      adapter: "openai-compatible-chat",
      capabilities: { vision: false, singleChoice: false, probabilities: false },
      tasks: [],
      games: [],
      accent: "#888",
    },
  );
}
