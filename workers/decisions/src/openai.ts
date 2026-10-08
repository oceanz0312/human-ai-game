import { buildOddCellInstructions, type DecisionErrorCode, type DecisionInput, gridSizeFromChoices } from "../../../src/server/decisions/contracts";

export interface OpenAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export type OpenAiOutcome =
  | { ok: true; choice: string; confidence: number; probabilities: Record<string, number>; modelElapsedMs: number }
  | { ok: false; errorCode: DecisionErrorCode; modelElapsedMs: number };

export function buildDecisionBody(input: DecisionInput, model: string) {
  const gridSize = gridSizeFromChoices(input.choices);
  return {
    model,
    input: [{ type: "message", role: "user", content: [{ type: "input_image", image_url: input.imageDataUrl, detail: "high" }] }],
    questions: [
      {
        type: "choice",
        name: "odd_cell",
        instructions: buildOddCellInstructions(gridSize),
        choices: input.choices.map((value) => {
          const [, row, column] = /^r(\d)c(\d)$/.exec(value) ?? [];
          return { value, description: `row ${row}, column ${column}` };
        }),
      },
    ],
  };
}

interface ChoiceAnswer {
  type: "choice";
  name: string | null;
  choice: unknown;
  confidence: unknown;
  probabilities: Array<{ value: unknown; probability: unknown }>;
}

/** Calls POST /v1/decisions exactly once. Requests that may have reached OpenAI are never retried. */
export async function requestOddCell(
  input: DecisionInput,
  config: OpenAiConfig,
  deps: { fetchImpl: typeof fetch; now: () => number },
): Promise<OpenAiOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = deps.now();
  const elapsed = () => Math.max(0, Math.round(deps.now() - startedAt));
  try {
    let response: Response;
    try {
      response = await deps.fetchImpl(`${config.baseUrl.replace(/\/$/, "")}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(buildDecisionBody(input, config.model)),
        signal: controller.signal,
      });
    } catch {
      return { ok: false, errorCode: controller.signal.aborted ? "upstream_timeout" : "network_error", modelElapsedMs: elapsed() };
    }
    if (response.status === 429) return { ok: false, errorCode: "rate_limited", modelElapsedMs: elapsed() };
    if (!response.ok) return { ok: false, errorCode: response.status >= 500 ? "upstream_error" : "invalid_response", modelElapsedMs: elapsed() };

    let body: { answers?: unknown };
    try {
      body = (await response.json()) as { answers?: unknown };
    } catch {
      return { ok: false, errorCode: controller.signal.aborted ? "upstream_timeout" : "invalid_response", modelElapsedMs: elapsed() };
    }
    const modelElapsedMs = elapsed();
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const answer = answers.find((item) => item && typeof item === "object" && ((item as { name?: unknown }).name === "odd_cell" || answers.length === 1)) as
      | { type?: unknown }
      | undefined;
    if (!answer) return { ok: false, errorCode: "invalid_response", modelElapsedMs };
    if (answer.type === "refusal") return { ok: false, errorCode: "refused", modelElapsedMs };
    if (answer.type !== "choice") return { ok: false, errorCode: "invalid_response", modelElapsedMs };

    const choiceAnswer = answer as ChoiceAnswer;
    if (typeof choiceAnswer.choice !== "string" || !input.choices.includes(choiceAnswer.choice)) {
      return { ok: false, errorCode: "invalid_choice", modelElapsedMs };
    }
    const confidence = typeof choiceAnswer.confidence === "number" ? Math.min(1, Math.max(0, choiceAnswer.confidence)) : 0;
    const probabilities: Record<string, number> = {};
    for (const item of Array.isArray(choiceAnswer.probabilities) ? choiceAnswer.probabilities : []) {
      if (typeof item?.value === "string" && input.choices.includes(item.value) && typeof item.probability === "number") {
        probabilities[item.value] = item.probability;
      }
    }
    return { ok: true, choice: choiceAnswer.choice, confidence, probabilities, modelElapsedMs };
  } finally {
    clearTimeout(timer);
  }
}
