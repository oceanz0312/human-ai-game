import type { DecisionErrorCode, WorkerDecisionResponse } from "./contracts";
import type { OpenAiOutcome } from "./openai";

export function workerResultFromOpenAiOutcome(
  outcome: OpenAiOutcome,
  requestId: string,
  failure: (errorCode: DecisionErrorCode, modelElapsedMs?: number, detail?: string | null) => WorkerDecisionResponse,
): WorkerDecisionResponse {
  if (!outcome.ok) return failure(outcome.errorCode, outcome.modelElapsedMs, outcome.detail);
  return {
    status: "complete",
    choice: outcome.choice,
    confidence: outcome.confidence,
    probabilities: outcome.probabilities,
    modelElapsedMs: outcome.modelElapsedMs,
    errorCode: null,
    requestId,
  };
}
