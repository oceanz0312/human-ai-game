import type { AiDispatch, BrowserDecisionResponse } from "@/game/contracts";
import { jsonRequest } from "@/lib/api-client";

export type AiNetworkProgress = {
  ticketIssuedAt: number | null;
  requestSentAt: number | null;
  responseReceivedAt: number | null;
  requestId: string | null;
  errorCode: string | null;
  modelElapsedMs: number | null;
  totalElapsedMs: number | null;
  imageLoadMs: number | null;
};

export type DispatchRoundAiOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: AiNetworkProgress) => void;
};

function emit(onProgress: DispatchRoundAiOptions["onProgress"], progress: AiNetworkProgress) {
  onProgress?.(progress);
}

/** Triggers the round AI from the browser so the call appears in DevTools Network. */
export async function dispatchRoundAi(
  dispatch: AiDispatch,
  options: DispatchRoundAiOptions = {},
): Promise<{ progress: AiNetworkProgress; response: BrowserDecisionResponse | null }> {
  const { signal, onProgress } = options;
  const ticketIssuedAt = dispatch.mode === "worker" ? dispatch.issuedAt : null;
  if (dispatch.mode === "fake") {
    const issued = Date.now();
    emit(onProgress, {
      ticketIssuedAt: issued,
      requestSentAt: null,
      responseReceivedAt: null,
      requestId: null,
      errorCode: null,
      modelElapsedMs: null,
      totalElapsedMs: null,
      imageLoadMs: null,
    });
    const requestSentAt = Date.now();
    emit(onProgress, {
      ticketIssuedAt: issued,
      requestSentAt,
      responseReceivedAt: null,
      requestId: null,
      errorCode: null,
      modelElapsedMs: null,
      totalElapsedMs: null,
      imageLoadMs: 0,
    });
    await jsonRequest<{ ok: boolean }>(dispatch.url, { method: "POST", signal });
    const responseReceivedAt = Date.now();
    const progress: AiNetworkProgress = {
      ticketIssuedAt: issued,
      requestSentAt,
      responseReceivedAt,
      requestId: "fake",
      errorCode: null,
      modelElapsedMs: 0,
      totalElapsedMs: Math.max(0, responseReceivedAt - requestSentAt),
      imageLoadMs: 0,
    };
    emit(onProgress, progress);
    return {
      progress,
      response: { status: "complete", requestId: "fake", modelElapsedMs: 0, errorCode: null, receivedAt: responseReceivedAt, imageLoadMs: 0 },
    };
  }
  emit(onProgress, {
    ticketIssuedAt,
    requestSentAt: null,
    responseReceivedAt: null,
    requestId: null,
    errorCode: null,
    modelElapsedMs: null,
    totalElapsedMs: null,
    imageLoadMs: null,
  });
  const requestSentAt = Date.now();
  emit(onProgress, {
    ticketIssuedAt,
    requestSentAt,
    responseReceivedAt: null,
    requestId: null,
    errorCode: null,
    modelElapsedMs: null,
    totalElapsedMs: null,
    imageLoadMs: null,
  });
  const response = await fetch(dispatch.url, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket: dispatch.ticket }),
    signal,
  });
  const body = (await response.json().catch(() => ({}))) as BrowserDecisionResponse & { error?: string };
  const responseReceivedAt = Date.now();
  const totalElapsedMs = Math.max(0, responseReceivedAt - requestSentAt);
  const imageLoadMs = typeof body.imageLoadMs === "number" ? body.imageLoadMs : null;
  if (!response.ok && !body.requestId) {
    const progress: AiNetworkProgress = {
      ticketIssuedAt,
      requestSentAt,
      responseReceivedAt,
      requestId: null,
      errorCode: body.error ?? `http_${response.status}`,
      modelElapsedMs: null,
      totalElapsedMs,
      imageLoadMs,
    };
    emit(onProgress, progress);
    return { progress, response: null };
  }
  const progress: AiNetworkProgress = {
    ticketIssuedAt,
    requestSentAt,
    responseReceivedAt,
    requestId: body.requestId ?? null,
    errorCode: body.errorCode ?? null,
    modelElapsedMs: body.modelElapsedMs ?? null,
    totalElapsedMs,
    imageLoadMs,
  };
  emit(onProgress, progress);
  return {
    progress,
    response: body.requestId
      ? {
          status: body.status ?? "error",
          requestId: body.requestId,
          modelElapsedMs: body.modelElapsedMs ?? 0,
          errorCode: body.errorCode ?? null,
          receivedAt: body.receivedAt ?? responseReceivedAt,
          imageLoadMs: body.imageLoadMs ?? 0,
        }
      : null,
  };
}
