import type { AiDispatch, BrowserDecisionResponse } from "@/game/contracts";
import { jsonRequest } from "@/lib/api-client";

export type AiNetworkProgress = {
  ticketIssuedAt: number | null;
  requestSentAt: number | null;
  responseReceivedAt: number | null;
  requestId: string | null;
  errorCode: string | null;
};

/** Triggers the round AI from the browser so the call appears in DevTools Network. */
export async function dispatchRoundAi(dispatch: AiDispatch, signal?: AbortSignal): Promise<{ progress: AiNetworkProgress; response: BrowserDecisionResponse | null }> {
  const ticketIssuedAt = dispatch.mode === "worker" ? Date.now() : null;
  if (dispatch.mode === "fake") {
    const requestSentAt = Date.now();
    await jsonRequest<{ ok: boolean }>(dispatch.url, { method: "POST", signal });
    return {
      progress: { ticketIssuedAt: requestSentAt, requestSentAt, responseReceivedAt: Date.now(), requestId: "fake", errorCode: null },
      response: { status: "complete", requestId: "fake", modelElapsedMs: 0, errorCode: null, receivedAt: Date.now() },
    };
  }
  const requestSentAt = Date.now();
  const response = await fetch(dispatch.url, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket: dispatch.ticket }),
    signal,
  });
  const body = (await response.json().catch(() => ({}))) as BrowserDecisionResponse & { error?: string };
  const responseReceivedAt = Date.now();
  if (!response.ok && !body.requestId) {
    return {
      progress: { ticketIssuedAt, requestSentAt, responseReceivedAt, requestId: null, errorCode: body.error ?? `http_${response.status}` },
      response: null,
    };
  }
  return {
    progress: {
      ticketIssuedAt,
      requestSentAt,
      responseReceivedAt,
      requestId: body.requestId ?? null,
      errorCode: body.errorCode,
    },
    response: body.requestId
      ? {
          status: body.status ?? "error",
          requestId: body.requestId,
          modelElapsedMs: body.modelElapsedMs ?? 0,
          errorCode: body.errorCode ?? null,
          receivedAt: body.receivedAt ?? responseReceivedAt,
        }
      : null,
  };
}
