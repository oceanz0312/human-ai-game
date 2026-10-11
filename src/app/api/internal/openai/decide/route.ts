import {
  internalOpenAiDecideRequestSchema,
  type DecisionErrorCode,
  workerDecisionResponseSchema,
} from "@/server/decisions/contracts";
import { readOpenAiConfigFromEnv } from "@/server/decisions/openai-config";
import { workerResultFromOpenAiOutcome } from "@/server/decisions/openai-outcome";
import { requestOddCell } from "@/server/decisions/openai";
import { json, readJson } from "@/server/http";
import { isWorkerAuthorized } from "@/server/worker-auth";

const failure = (requestId: string, errorCode: DecisionErrorCode, modelElapsedMs = 0, detail: string | null = null) =>
  workerDecisionResponseSchema.parse({
    status: "error",
    choice: null,
    confidence: null,
    probabilities: {},
    modelElapsedMs,
    errorCode,
    detail,
    requestId,
  });

/** OpenAI Decisions proxy: runs on the game Worker (WNAM / smart placement) so egress is US-side. */
export async function POST(request: Request) {
  if (!(await isWorkerAuthorized(request, process.env.DECISIONS_WORKER_SHARED_SECRET))) {
    return json({ error: "unauthorized" }, 401);
  }
  const raw = await readJson(request);
  const parsed = internalOpenAiDecideRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const requestId = typeof (raw as { requestId?: unknown })?.requestId === "string" ? (raw as { requestId: string }).requestId : "invalid";
    return json(failure(requestId, "invalid_request"), 400);
  }
  const { requestId, imageDataUrl, choices } = parsed.data;
  const config = readOpenAiConfigFromEnv();
  if (!config) return json(failure(requestId, "ai_unconfigured"), 503);

  const outcome = await requestOddCell(
    { imageDataUrl, choices },
    config,
    {
      fetchImpl: fetch,
      now: () => Date.now(),
      log: (entry) => console.log(JSON.stringify({ scope: "game_openai_proxy", requestId, ...entry })),
    },
  );
  const result = workerResultFromOpenAiOutcome(outcome, requestId, (errorCode, modelElapsedMs = 0, detail = null) =>
    failure(requestId, errorCode, modelElapsedMs, detail),
  );
  return json(workerDecisionResponseSchema.parse(result));
}
