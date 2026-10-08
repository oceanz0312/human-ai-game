import "server-only";
import { type DecisionClient, type DecisionErrorCode, type DecisionInput, type DecisionResult, workerDecisionResponseSchema } from "./contracts";

function errorResult(errorCode: DecisionErrorCode, elapsedMs: number, requestId = "none"): DecisionResult {
  return { status: "error", choice: null, confidence: null, probabilities: {}, modelElapsedMs: 0, errorCode, requestId, elapsedMs };
}

export function createCloudflareDecisionClient(env: { url: string; sharedSecret: string; now?: () => number; fetchImpl?: typeof fetch }): DecisionClient {
  const now = env.now ?? (() => performance.now());
  const fetchImpl = env.fetchImpl ?? fetch;
  const endpoint = new URL("/v1/decide", env.url).toString();

  return {
    async decide(input: DecisionInput, signal: AbortSignal) {
      const startedAt = now();
      const elapsed = () => Math.max(0, Math.round(now() - startedAt));
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.sharedSecret}` },
          body: JSON.stringify(input),
          signal,
        });
      } catch {
        return errorResult(signal.aborted ? "upstream_timeout" : "worker_unavailable", elapsed());
      }
      const requestId = response.headers.get("X-Request-Id") ?? "none";
      if (response.status === 401) return errorResult("unauthorized", elapsed(), requestId);
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return errorResult("invalid_response", elapsed(), requestId);
      }
      const parsed = workerDecisionResponseSchema.safeParse(body);
      if (!parsed.success) return errorResult(response.ok ? "invalid_response" : "worker_unavailable", elapsed(), requestId);
      const result: DecisionResult = { ...parsed.data, elapsedMs: elapsed() };
      if (result.status === "complete" && (!result.choice || !input.choices.includes(result.choice))) {
        return errorResult("invalid_choice", result.elapsedMs, result.requestId);
      }
      return result;
    },
  };
}

/** Always answers "AI 掉线" when no Worker is configured in production. */
export function createUnconfiguredDecisionClient(): DecisionClient {
  return { decide: async () => errorResult("ai_unconfigured", 0) };
}
