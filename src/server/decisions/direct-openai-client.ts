import "server-only";
import { type DecisionClient, type DecisionInput, type DecisionResult, type DecisionErrorCode } from "./contracts";
import { readOpenAiConfigFromEnv } from "./openai-config";
import { requestOddCell } from "./openai";

function errorResult(errorCode: DecisionErrorCode, elapsedMs: number, requestId = "none", detail: string | null = null): DecisionResult {
  return {
    status: "error",
    choice: null,
    confidence: null,
    probabilities: {},
    modelElapsedMs: 0,
    errorCode,
    requestId,
    elapsedMs,
    ...(detail ? { detail } : {}),
  };
}

/** Server-side OpenAI on the game Worker (same path as the internal proxy route). */
export function createDirectOpenAiDecisionClient(): DecisionClient {
  return {
    async decide(input: DecisionInput, signal: AbortSignal) {
      const config = readOpenAiConfigFromEnv();
      if (!config) return errorResult("ai_unconfigured", 0);
      const startedAt = Date.now();
      const elapsed = () => Math.max(0, Date.now() - startedAt);
      const outcome = await requestOddCell(input, config, {
        fetchImpl: (url, init) => fetch(url, { ...init, signal }),
        now: () => Date.now(),
      });
      if (!outcome.ok) return errorResult(outcome.errorCode, elapsed(), "direct", outcome.detail);
      return {
        status: "complete",
        choice: outcome.choice,
        confidence: outcome.confidence,
        probabilities: outcome.probabilities,
        modelElapsedMs: outcome.modelElapsedMs,
        errorCode: null,
        requestId: "direct",
        elapsedMs: elapsed(),
      };
    },
  };
}
