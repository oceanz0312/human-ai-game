import {
  internalOpenAiDecideRequestSchema,
  type DecisionInput,
  type WorkerDecisionResponse,
  workerDecisionResponseSchema,
} from "../../../src/server/decisions/contracts";
import type { WorkerEnv } from "./env";

/** Ask the game service (US-side egress) to call OpenAI; Decisions Worker never holds the API key. */
export async function requestOpenAiViaGame(
  env: WorkerEnv,
  requestId: string,
  input: DecisionInput,
  fetchImpl: typeof fetch,
  log?: (entry: Record<string, string | number | null>) => void,
): Promise<WorkerDecisionResponse | null> {
  const secret = env.DECISIONS_WORKER_SHARED_SECRET;
  if (!env.GAME || !secret) {
    log?.({ kind: "game_openai_proxy_skipped", reason: env.GAME ? "missing_secret" : "missing_game_binding" });
    return null;
  }
  const body = internalOpenAiDecideRequestSchema.parse({ requestId, ...input });
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await env.GAME.fetch(
      new Request("https://game.internal/api/internal/openai/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(body),
      }),
    );
  } catch {
    log?.({ kind: "game_openai_proxy_failed", errorCode: "network_error", elapsedMs: Date.now() - startedAt });
    return null;
  }
  const elapsedMs = Date.now() - startedAt;
  if (response.status === 401) {
    log?.({ kind: "game_openai_proxy_failed", httpStatus: 401, errorCode: "unauthorized" });
    return null;
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    log?.({ kind: "game_openai_proxy_failed", httpStatus: response.status, errorCode: "invalid_response" });
    return null;
  }
  const parsed = workerDecisionResponseSchema.safeParse(json);
  if (!parsed.success) {
    log?.({ kind: "game_openai_proxy_failed", httpStatus: response.status, errorCode: "invalid_response" });
    return null;
  }
  log?.({
    kind: "game_openai_proxy_ok",
    httpStatus: response.status,
    elapsedMs,
    errorCode: parsed.data.errorCode,
    modelElapsedMs: parsed.data.modelElapsedMs,
  });
  return { ...parsed.data, requestId: parsed.data.requestId || requestId };
}
