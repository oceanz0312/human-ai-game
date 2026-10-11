import {
  browserDecisionResponseSchema,
  type DecisionErrorCode,
  type WorkerDecisionResponse,
  publicDecideRequestSchema,
} from "../../../src/server/decisions/contracts";
import { sha256Hex, verifyDecisionTicket } from "../../../src/server/decisions/ticket";
import { requestOddCell } from "./openai";
import type { TicketConsumeStore } from "./ticket-store";
import type { WorkerEnv } from "./env";

interface PublicDecideDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  log?: (entry: Record<string, string | number | null>) => void;
  randomId?: () => string;
  ticketStore?: TicketConsumeStore;
}

const SECURITY_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function levelImagePath(level: number) {
  return `/levels/v1/${String(level).padStart(2, "0")}.png`;
}

function allowedOrigins(env: WorkerEnv) {
  const origins = new Set<string>(["http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:3100"]);
  if (env.PUBLIC_BASE_URL) origins.add(env.PUBLIC_BASE_URL.replace(/\/$/, ""));
  return origins;
}

function corsHeaders(request: Request, env: WorkerEnv): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins(env).has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function reportToGame(env: WorkerEnv, body: unknown, fetchImpl: typeof fetch) {
  if (env.GAME) {
    return env.GAME.fetch(
      new Request("https://game.internal/api/internal/ai-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DECISIONS_WORKER_SHARED_SECRET}`,
        },
        body: JSON.stringify(body),
      }),
    );
  }
  const base = env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return fetchImpl(`${base}/api/internal/ai-result`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DECISIONS_WORKER_SHARED_SECRET}`,
    },
    body: JSON.stringify(body),
  });
}

async function loadLevelImage(baseUrl: string, level: number, fetchImpl: typeof fetch) {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${levelImagePath(level)}`);
  if (!response.ok) throw new Error("image_fetch_failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  const base64 = btoa(binary);
  return { dataUrl: `data:image/png;base64,${base64}`, bytes };
}

export function createPublicDecideHandler(deps: PublicDecideDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = deps.now ?? (() => Date.now());
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)));
  const randomId = deps.randomId ?? (() => crypto.randomUUID());

  return {
    async handle(request: Request, env: WorkerEnv, ticketStore: TicketConsumeStore): Promise<Response> {
      const cors = corsHeaders(request, env);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      const requestId = randomId();
      const startedAt = now();
      const respond = (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, ...cors, "X-Request-Id": requestId } });

      const failure = (errorCode: DecisionErrorCode, modelElapsedMs = 0): WorkerDecisionResponse => ({
        status: "error",
        choice: null,
        confidence: null,
        probabilities: {},
        modelElapsedMs,
        errorCode,
        requestId,
      });

      if (!(request.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) {
        return respond(400, { error: "invalid_request" });
      }
      let json: unknown;
      try {
        json = await request.json();
      } catch {
        return respond(400, { error: "invalid_request" });
      }
      const parsedBody = publicDecideRequestSchema.safeParse(json);
      if (!parsedBody.success) return respond(400, { error: "invalid_request" });

      const secret = env.DECISIONS_WORKER_SHARED_SECRET;
      if (!secret) return respond(500, { error: "ai_unconfigured" });

      const verified = await verifyDecisionTicket(parsedBody.data.ticket, secret, now());
      if (!verified.ok) {
        const browserBody = browserDecisionResponseSchema.parse({
          status: "error",
          requestId,
          modelElapsedMs: 0,
          errorCode: verified.error,
          receivedAt: now(),
        });
        return respond(401, browserBody);
      }
      const payload = verified.payload;
      const consumed = await ticketStore.consume(payload.jti, payload.roundId, now());
      if (consumed === "replayed") {
        const browserBody = browserDecisionResponseSchema.parse({
          status: "error",
          requestId,
          modelElapsedMs: 0,
          errorCode: "ticket_replayed",
          receivedAt: now(),
        });
        return respond(409, browserBody);
      }

      const imageBase = env.PUBLIC_BASE_URL;
      if (!imageBase) return respond(500, { error: "ai_unconfigured" });

      let imageDataUrl: string;
      try {
        const loaded = await loadLevelImage(imageBase, payload.level, fetchImpl);
        const hash = await sha256Hex(loaded.bytes);
        if (hash !== payload.imageSha256) {
          const result = failure("invalid_request");
          await reportToGame(env, { roundId: payload.roundId, jti: payload.jti, result }, fetchImpl);
          const browserBody = browserDecisionResponseSchema.parse({
            status: "error",
            requestId,
            modelElapsedMs: 0,
            errorCode: "invalid_request",
            receivedAt: now(),
          });
          return respond(400, browserBody);
        }
        imageDataUrl = loaded.dataUrl;
      } catch {
        const result = failure("network_error");
        await reportToGame(env, { roundId: payload.roundId, jti: payload.jti, result }, fetchImpl);
        const browserBody = browserDecisionResponseSchema.parse({
          status: "error",
          requestId,
          modelElapsedMs: 0,
          errorCode: "network_error",
          receivedAt: now(),
        });
        return respond(502, browserBody);
      }

      if (!env.OPENAI_API_KEY) {
        const result = failure("ai_unconfigured");
        await reportToGame(env, { roundId: payload.roundId, jti: payload.jti, result }, fetchImpl);
        const browserBody = browserDecisionResponseSchema.parse({
          status: "error",
          requestId,
          modelElapsedMs: 0,
          errorCode: "ai_unconfigured",
          receivedAt: now(),
        });
        return respond(200, browserBody);
      }

      const outcome = await requestOddCell(
        { imageDataUrl, choices: payload.choices },
        {
          apiKey: env.OPENAI_API_KEY,
          baseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
          model: env.OPENAI_DECISIONS_MODEL || "gpt-6-luna",
          timeoutMs: Number(env.OPENAI_DECISIONS_TIMEOUT_MS) || 8000,
        },
        { fetchImpl, now },
      );

      const workerResult: WorkerDecisionResponse = outcome.ok
        ? {
            status: "complete",
            choice: outcome.choice,
            confidence: outcome.confidence,
            probabilities: outcome.probabilities,
            modelElapsedMs: outcome.modelElapsedMs,
            errorCode: null,
            requestId,
          }
        : failure(outcome.errorCode, outcome.modelElapsedMs);

      const reportResponse = await reportToGame(
        env,
        { roundId: payload.roundId, jti: payload.jti, result: workerResult, wallElapsedMs: Math.max(0, Math.round(now() - startedAt)) },
        fetchImpl,
      );
      if (reportResponse && !reportResponse.ok) {
        log({ requestId, status: reportResponse.status, errorCode: "worker_unavailable", roundId: payload.roundId });
      }

      const browserBody = browserDecisionResponseSchema.parse({
        status: workerResult.status,
        requestId,
        modelElapsedMs: workerResult.modelElapsedMs,
        errorCode: workerResult.errorCode,
        receivedAt: now(),
      });
      return respond(200, browserBody);
    },
  };
}
