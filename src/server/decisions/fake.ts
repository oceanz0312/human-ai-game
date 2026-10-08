import type { DecisionClient, DecisionErrorCode, DecisionInput, DecisionResult } from "./contracts";

export interface FakeDecisionPlan {
  choice?: string | null;
  errorCode?: DecisionErrorCode;
  latencyMs?: number;
  confidence?: number;
}

/**
 * Deterministic stand-in for the Worker used by tests and local development without OpenAI
 * access. `plan` decides each answer from the request; it never sees game state.
 */
export class FakeDecisionClient implements DecisionClient {
  calls: DecisionInput[] = [];

  constructor(private readonly plan: (input: DecisionInput) => FakeDecisionPlan | Promise<FakeDecisionPlan>) {}

  async decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult> {
    this.calls.push(input);
    const plan = await this.plan(input);
    const latencyMs = plan.latencyMs ?? 0;
    if (latencyMs > 0) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, latencyMs);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    const requestId = `fake-${this.calls.length}`;
    if (signal.aborted) return error("upstream_timeout", latencyMs, requestId);
    if (plan.errorCode) return error(plan.errorCode, latencyMs, requestId);
    const choice = plan.choice ?? input.choices[0];
    const confidence = plan.confidence ?? 0.9;
    return {
      status: "complete",
      choice,
      confidence,
      probabilities: { [choice]: confidence },
      modelElapsedMs: latencyMs,
      errorCode: null,
      requestId,
      elapsedMs: latencyMs,
    };
  }
}

function error(errorCode: DecisionErrorCode, elapsedMs: number, requestId: string): DecisionResult {
  return { status: "error", choice: null, confidence: null, probabilities: {}, modelElapsedMs: 0, errorCode, requestId, elapsedMs };
}
