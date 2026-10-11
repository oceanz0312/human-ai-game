import { buildOddCellInstructions, type DecisionErrorCode, type DecisionInput, gridSizeFromChoices } from "./contracts";
import { classifyOpenAiHttpFailure, formatOpenAiErrorDetail, openAiErrorCodeFromBody, sanitizeOpenAiSnippet } from "./openai-detail";

export interface OpenAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export type OpenAiOutcome =
  | { ok: true; choice: string; confidence: number; probabilities: Record<string, number>; modelElapsedMs: number }
  | { ok: false; errorCode: DecisionErrorCode; modelElapsedMs: number; detail: string | null };

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

function httpErrorCode(status: number): DecisionErrorCode {
  if (status === 429) return "rate_limited";
  if (status >= 500) return "upstream_error";
  return "invalid_response";
}

/** Calls POST /v1/decisions exactly once. Requests that may have reached OpenAI are never retried. */
export async function requestOddCell(
  input: DecisionInput,
  config: OpenAiConfig,
  deps: {
    fetchImpl: typeof fetch;
    now: () => number;
    log?: (entry: Record<string, string | number | null>) => void;
  },
): Promise<OpenAiOutcome> {
  const log = deps.log ?? (() => undefined);
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
      const errorCode = controller.signal.aborted ? "upstream_timeout" : "network_error";
      log({ kind: "openai_fetch_failed", errorCode, modelElapsedMs: elapsed() });
      return { ok: false, errorCode, modelElapsedMs: elapsed(), detail: errorCode === "upstream_timeout" ? "fetch aborted (timeout)" : "fetch failed" };
    }

    const rawBody = await response.text();
    const snippet = sanitizeOpenAiSnippet(rawBody);

    let parsedBody: unknown = null;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = null;
      }
    }

    if (response.status === 429) {
      log({ kind: "openai_http_error", httpStatus: 429, errorCode: "rate_limited", bodyPreview: snippet || null });
      return { ok: false, errorCode: "rate_limited", modelElapsedMs: elapsed(), detail: formatOpenAiErrorDetail(429, snippet || null) };
    }
    if (!response.ok) {
      const errorCode = classifyOpenAiHttpFailure(response.status, parsedBody) ?? httpErrorCode(response.status);
      const detail = formatOpenAiErrorDetail(response.status, snippet || null);
      log({
        kind: errorCode === "region_unsupported" ? "openai_region_blocked" : "openai_http_error",
        httpStatus: response.status,
        errorCode,
        openAiErrorCode: openAiErrorCodeFromBody(parsedBody),
        bodyPreview: snippet || null,
        modelElapsedMs: elapsed(),
      });
      return { ok: false, errorCode, modelElapsedMs: elapsed(), detail };
    }

    let body: { answers?: unknown };
    try {
      body = JSON.parse(rawBody) as { answers?: unknown };
    } catch {
      log({ kind: "openai_parse_error", httpStatus: response.status, bodyPreview: snippet || null });
      return {
        ok: false,
        errorCode: "invalid_response",
        modelElapsedMs: elapsed(),
        detail: formatOpenAiErrorDetail(response.status, snippet || null, "non-JSON body"),
      };
    }
    const modelElapsedMs = elapsed();
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const answer = answers.find((item) => item && typeof item === "object" && ((item as { name?: unknown }).name === "odd_cell" || answers.length === 1)) as
      | { type?: unknown }
      | undefined;
    if (!answer) {
      log({ kind: "openai_shape_error", httpStatus: response.status, errorCode: "invalid_response", bodyPreview: snippet || null });
      return {
        ok: false,
        errorCode: "invalid_response",
        modelElapsedMs,
        detail: formatOpenAiErrorDetail(response.status, snippet || null, "missing odd_cell answer"),
      };
    }
    if (answer.type === "refusal") return { ok: false, errorCode: "refused", modelElapsedMs, detail: null };
    if (answer.type !== "choice") {
      log({ kind: "openai_shape_error", httpStatus: response.status, errorCode: "invalid_response", answerType: String(answer.type) });
      return {
        ok: false,
        errorCode: "invalid_response",
        modelElapsedMs,
        detail: formatOpenAiErrorDetail(response.status, null, `unexpected answer type ${String(answer.type)}`),
      };
    }

    const choiceAnswer = answer as ChoiceAnswer;
    if (typeof choiceAnswer.choice !== "string" || !input.choices.includes(choiceAnswer.choice)) {
      return {
        ok: false,
        errorCode: "invalid_choice",
        modelElapsedMs,
        detail: formatOpenAiErrorDetail(response.status, null, "choice outside candidate set"),
      };
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
