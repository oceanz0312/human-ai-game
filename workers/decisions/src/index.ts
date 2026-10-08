import { decisionRequestSchema, type DecisionErrorCode, MAX_IMAGE_BYTES, type WorkerDecisionResponse } from "../../../src/server/decisions/contracts";
import { requestOddCell } from "./openai";

export interface WorkerEnv {
  OPENAI_API_KEY: string;
  DECISIONS_WORKER_SHARED_SECRET: string;
  OPENAI_BASE_URL?: string;
  OPENAI_DECISIONS_MODEL?: string;
  OPENAI_DECISIONS_TIMEOUT_MS?: string;
}

interface HandlerDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  log?: (entry: Record<string, string | number | null>) => void;
  randomId?: () => string;
}

const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

const SECURITY_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

async function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(a)), crypto.subtle.digest("SHA-256", encoder.encode(b))]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

function approximateBase64Bytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

export function createWorkerHandler(deps: HandlerDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = deps.now ?? (() => Date.now());
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)));
  const randomId = deps.randomId ?? (() => crypto.randomUUID());

  return {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
      const requestId = randomId();
      const startedAt = now();
      let choiceCount: number | null = null;
      const respond = (status: number, body: WorkerDecisionResponse | { error: DecisionErrorCode | "not_found" | "method_not_allowed" }) => {
        const errorCode = "errorCode" in body ? body.errorCode : body.error;
        log({ requestId, status, elapsedMs: Math.round(now() - startedAt), errorCode: errorCode ?? null, choiceCount });
        return new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, "X-Request-Id": requestId } });
      };
      const failure = (errorCode: DecisionErrorCode, modelElapsedMs = 0): WorkerDecisionResponse => ({
        status: "error",
        choice: null,
        confidence: null,
        probabilities: {},
        modelElapsedMs,
        errorCode,
        requestId,
      });

      const url = new URL(request.url);
      if (url.pathname !== "/v1/decide") return respond(404, { error: "not_found" });
      if (request.method !== "POST") return respond(405, { error: "method_not_allowed" });

      const authorization = request.headers.get("Authorization") ?? "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
      if (!env.DECISIONS_WORKER_SHARED_SECRET || !token || !(await timingSafeEqual(token, env.DECISIONS_WORKER_SHARED_SECRET))) {
        return respond(401, failure("unauthorized"));
      }
      if (!(request.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) {
        return respond(400, failure("invalid_request"));
      }
      const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
      if (declaredLength > MAX_BODY_BYTES) return respond(413, failure("payload_too_large"));

      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return respond(413, failure("payload_too_large"));
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return respond(400, failure("invalid_request"));
      }
      const parsed = decisionRequestSchema.safeParse(json);
      if (!parsed.success) return respond(400, failure("invalid_request"));
      choiceCount = parsed.data.choices.length;
      if (approximateBase64Bytes(parsed.data.imageDataUrl) > MAX_IMAGE_BYTES) return respond(413, failure("payload_too_large"));
      if (!env.OPENAI_API_KEY) return respond(200, failure("ai_unconfigured"));

      const outcome = await requestOddCell(
        parsed.data,
        {
          apiKey: env.OPENAI_API_KEY,
          baseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
          model: env.OPENAI_DECISIONS_MODEL || "gpt-6-luna",
          timeoutMs: Number(env.OPENAI_DECISIONS_TIMEOUT_MS) || 8000,
        },
        { fetchImpl, now },
      );
      if (!outcome.ok) return respond(200, failure(outcome.errorCode, outcome.modelElapsedMs));
      return respond(200, {
        status: "complete",
        choice: outcome.choice,
        confidence: outcome.confidence,
        probabilities: outcome.probabilities,
        modelElapsedMs: outcome.modelElapsedMs,
        errorCode: null,
        requestId,
      });
    },
  };
}

export default createWorkerHandler();
