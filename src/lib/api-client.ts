import type { AiEvent, BeginRoundResponse, RoundStartLine, ResultView, RoundStartResponse, SessionSnapshot, SubmitResponse, LeaderboardRow } from "@/game/contracts";
import type { AnalyticsEventName } from "@/game/schemas";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

export async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError((body as { error?: string }).error ?? `http_${response.status}`, response.status);
  return body as T;
}

const post = <T>(url: string, body?: unknown) => jsonRequest<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  createSession: (body: { nickname?: string; replay?: boolean } = {}) => post<SessionSnapshot>("/api/sessions", body),
  getSession: (sessionId: string) => jsonRequest<SessionSnapshot>(`/api/sessions/${sessionId}`),
  startNextRound: (sessionId: string) => post<RoundStartResponse>(`/api/sessions/${sessionId}/rounds`),
  beginRound: (roundId: string) => post<BeginRoundResponse>(`/api/rounds/${roundId}/start`),
  beginRoundStream,
  submitRound: (roundId: string, body: { choice: string | null; elapsedMs: number }) => post<SubmitResponse>(`/api/rounds/${roundId}/submit`, body),
  getRound: (roundId: string) => jsonRequest<SubmitResponse>(`/api/rounds/${roundId}`),
  getResult: (publicId: string) => jsonRequest<ResultView>(`/api/results/${publicId}`),
  getLeaderboard: () => jsonRequest<{ version: string; top: LeaderboardRow[]; around: LeaderboardRow[] }>("/api/leaderboard?version=v1&limit=10"),
  setNickname: (nickname: string) => post<{ nickname: string }>("/api/players/me", { nickname }),
};

/**
 * POST /start. In server mode the response is an NDJSON stream: resolves with the begin line as soon as the round is
 * shown, then keeps calling `onAi` for each real AI event. Falls back to plain JSON (legacy browser dispatch).
 */
export async function beginRoundStream(roundId: string, onAi: (event: AiEvent) => void): Promise<BeginRoundResponse> {
  const response = await fetch(`/api/rounds/${roundId}/start`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error ?? `http_${response.status}`, response.status);
  }
  if (!(response.headers.get("Content-Type") ?? "").includes("ndjson") || !response.body) {
    return (await response.json()) as BeginRoundResponse;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let resolveBegin: (value: BeginRoundResponse) => void = () => {};
  let rejectBegin: (reason: unknown) => void = () => {};
  const begin = new Promise<BeginRoundResponse>((resolve, reject) => {
    resolveBegin = resolve;
    rejectBegin = reject;
  });
  let begun = false;
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const raw = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
          if (!raw) continue;
          const line = JSON.parse(raw) as RoundStartLine;
          if (line.type === "begin") {
            begun = true;
            resolveBegin(line.begin);
          } else if (line.type === "ai") {
            onAi(line.ai);
          }
        }
        if (done) break;
      }
      if (!begun) rejectBegin(new ApiError("stream_closed", 502));
    } catch (error) {
      if (!begun) rejectBegin(error);
    }
  })();
  return begin;
}

/** Retries an idempotent call with a short backoff; used for submissions after lock-in. */
export async function withRetry<T>(work: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 409 && error.status !== 429) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
  throw lastError;
}

export function track(name: AnalyticsEventName, input: { sessionId?: string | null; level?: number | null; metadata?: Record<string, string | number | boolean | null> } = {}) {
  const body = JSON.stringify({ name, sessionId: input.sessionId ?? null, level: input.level ?? null, clientTs: Date.now(), metadata: input.metadata });
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const sent = navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      if (sent) return;
    }
    void fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
  } catch {
    // Analytics is best-effort.
  }
}

export function haptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
  } catch {
    // Not supported.
  }
}
