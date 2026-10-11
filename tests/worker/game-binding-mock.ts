import type { WorkerDecisionResponse } from "@/server/decisions/contracts";

type OpenAiFetch = (url: string, init?: RequestInit) => Promise<Response>;

function workerResponseFromOpenAi(body: unknown, requestId: string, httpOk: boolean, httpStatus: number, choices: string[]): WorkerDecisionResponse {
  if (!httpOk) {
    const snippet = typeof body === "object" && body !== null ? JSON.stringify(body).slice(0, 120) : String(body).slice(0, 120);
    const upstreamCode =
      typeof body === "object" && body !== null && "error" in body && typeof (body as { error?: { code?: unknown } }).error?.code === "string"
        ? (body as { error: { code: string } }).error.code
        : null;
    const errorCode =
      upstreamCode === "unsupported_country_region_territory"
        ? "region_unsupported"
        : httpStatus === 429
          ? "rate_limited"
          : httpStatus >= 500
            ? "upstream_error"
            : "invalid_response";
    return {
      status: "error",
      choice: null,
      confidence: null,
      probabilities: {},
      modelElapsedMs: 1,
      errorCode,
      detail: `HTTP ${httpStatus} · ${snippet}`,
      requestId,
    };
  }
  const answers = (body as { answers?: unknown[] })?.answers ?? [];
  const answer = answers[0] as { type?: string; choice?: string; confidence?: number; probabilities?: { value: string; probability: number }[] } | undefined;
  if (answer?.type === "refusal") {
    return {
      status: "error",
      choice: null,
      confidence: null,
      probabilities: {},
      modelElapsedMs: 1,
      errorCode: "refused",
      detail: null,
      requestId,
    };
  }
  if (!answer || answer.type !== "choice" || typeof answer.choice !== "string") {
    return {
      status: "error",
      choice: null,
      confidence: null,
      probabilities: {},
      modelElapsedMs: 1,
      errorCode: "invalid_response",
      detail: "HTTP 200 · missing odd_cell answer",
      requestId,
    };
  }
  const probabilities: Record<string, number> = {};
  for (const item of answer.probabilities ?? []) probabilities[item.value] = item.probability;
  if (!choices.includes(answer.choice)) {
    return {
      status: "error",
      choice: null,
      confidence: null,
      probabilities: {},
      modelElapsedMs: 1,
      errorCode: "invalid_choice",
      detail: "HTTP 200 · choice outside candidate set",
      requestId,
    };
  }
  return {
    status: "complete",
    choice: answer.choice,
    confidence: typeof answer.confidence === "number" ? answer.confidence : 0,
    probabilities,
    modelElapsedMs: 3,
    errorCode: null,
    requestId,
  };
}

/** Simulates game service bindings: level image, ai-result, and OpenAI proxy route. */
export function createGameBindingMock(imageBytes: Uint8Array, gameReports: unknown[], openAiFetch?: OpenAiFetch | ReturnType<typeof vi.fn>) {
  return {
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = request.url;
      if (url.includes("/api/internal/levels/")) {
        return new Response(Buffer.from(imageBytes), { status: 200, headers: { "Content-Type": "image/png" } });
      }
      if (url.includes("/api/internal/ai-result")) {
        gameReports.push(JSON.parse(await request.clone().text()));
        return new Response(JSON.stringify({ accepted: true }), { status: 200 });
      }
      if (url.includes("/api/internal/openai/decide")) {
        const payload = (await request.json()) as { requestId: string; imageDataUrl: string; choices: string[] };
        if (openAiFetch) {
          try {
            const openAiResponse = await (openAiFetch as OpenAiFetch)("https://api.openai.com/v1/decisions", {});
            const openAiBody = await openAiResponse.json().catch(() => ({}));
            const result = workerResponseFromOpenAi(openAiBody, payload.requestId, openAiResponse.ok, openAiResponse.status, payload.choices);
            return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
          } catch {
            return new Response(
              JSON.stringify({
                status: "error",
                choice: null,
                confidence: null,
                probabilities: {},
                modelElapsedMs: 0,
                errorCode: "network_error",
                detail: "fetch failed",
                requestId: payload.requestId,
              } satisfies WorkerDecisionResponse),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
        }
        return new Response(
          JSON.stringify({
            status: "complete",
            choice: "r2c2",
            confidence: 0.8,
            probabilities: { r2c2: 0.8 },
            modelElapsedMs: 3,
            errorCode: null,
            requestId: payload.requestId,
          } satisfies WorkerDecisionResponse),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("missing", { status: 404 });
    }),
  } as unknown as Fetcher;
}
