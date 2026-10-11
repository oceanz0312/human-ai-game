// @vitest-environment node
import type { WorkerDecisionResponse } from "@/server/decisions/contracts";
import { createWorkerHandler, type WorkerEnv } from "../../workers/decisions/src/index";
import { createGameBindingMock } from "./game-binding-mock";

const SECRET = "test-shared-secret-with-enough-entropy";
const OPENAI_KEY = "sk-test-openai-key-should-never-leak";
const env = (game?: Fetcher): WorkerEnv => ({ DECISIONS_WORKER_SHARED_SECRET: SECRET, GAME: game });
const IMAGE = `data:image/png;base64,${Buffer.from("fake-png-bytes").toString("base64")}`;
const nine = Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`);
const eightyOne = Array.from({ length: 81 }, (_, i) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`);

function request(body: unknown, init: { secret?: string | null; method?: string; path?: string; contentType?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": init.contentType ?? "application/json" };
  if (init.secret !== null) headers.Authorization = `Bearer ${init.secret ?? SECRET}`;
  return new Request(`https://worker.test${init.path ?? "/v1/decide"}`, {
    method: init.method ?? "POST",
    headers,
    body: init.method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

function openAiReturning(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const choiceAnswer = (choice: string, confidence = 0.91) => ({
  model: "gpt-6-luna",
  answers: [{ type: "choice", name: "odd_cell", choice, confidence, probabilities: [{ value: choice, probability: confidence }, { value: "r1c1", probability: 0.05 }] }],
});

function setup(openAiFetch: ReturnType<typeof vi.fn>) {
  const logs: string[] = [];
  const gameReports: unknown[] = [];
  const game = createGameBindingMock(new Uint8Array(Buffer.from("fake-png-bytes")), gameReports, openAiFetch);
  let tick = 1000;
  const handler = createWorkerHandler({
    fetchImpl: vi.fn() as unknown as typeof fetch,
    now: () => (tick += 7),
    log: (entry) => logs.push(JSON.stringify(entry)),
    randomId: () => "req-1",
  });
  return { handler, logs, game };
}

test("forwards a validated 9-cell puzzle without exposing secrets", async () => {
  const openAiFetch = openAiReturning(choiceAnswer("r2c2"));
  const { handler, logs, game } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: nine }), env(game));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("X-Request-Id")).toBe("req-1");
  expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  const body = (await response.json()) as WorkerDecisionResponse;
  expect(body).toMatchObject({ status: "complete", choice: "r2c2", confidence: 0.91, errorCode: null, requestId: "req-1" });
  expect(body.modelElapsedMs).toBeGreaterThan(0);
  expect(JSON.stringify(body)).not.toContain(OPENAI_KEY);

  expect(vi.mocked(game.fetch).mock.calls.some((call) => (call[0] as Request).url.includes("/api/internal/openai/decide"))).toBe(true);
  expect(openAiFetch).toHaveBeenCalledWith("https://api.openai.com/v1/decisions", expect.anything());

  const logText = logs.join("\n");
  expect(logText).not.toContain(SECRET);
  expect(logText).not.toContain(OPENAI_KEY);
  expect(logText).not.toContain("base64");
  const entries = logs.map((line) => JSON.parse(line) as Record<string, unknown>);
  expect(entries.find((entry) => entry.choiceCount === 9)).toMatchObject({ requestId: "req-1", status: 200, errorCode: null });
  expect(entries.some((entry) => entry.kind === "game_openai_proxy_ok")).toBe(true);
});

test("accepts 81 candidates for 9×9 levels", async () => {
  const openAiFetch = openAiReturning(choiceAnswer("r5c7"));
  const { handler, game } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: eightyOne }), env(game));
  expect(((await response.json()) as WorkerDecisionResponse).choice).toBe("r5c7");
  expect(vi.mocked(game.fetch).mock.calls.some((call) => (call[0] as Request).url.includes("/api/internal/openai/decide"))).toBe(true);
  expect(openAiFetch).toHaveBeenCalledTimes(1);
});

test.each([
  ["missing secret", request({ imageDataUrl: IMAGE, choices: nine }, { secret: null }), 401],
  ["wrong secret", request({ imageDataUrl: IMAGE, choices: nine }, { secret: "nope" }), 401],
  ["non-POST", request(null, { method: "GET" }), 405],
  ["unknown path", request({}, { path: "/v1/other" }), 404],
  ["malformed JSON", request("{not json"), 400],
  ["wrong content type", request({ imageDataUrl: IMAGE, choices: nine }, { contentType: "text/plain" }), 400],
  ["non-image data URL", request({ imageDataUrl: "data:text/plain;base64,aGVsbG8=", choices: nine }), 400],
  ["external image URL", request({ imageDataUrl: "https://example.com/a.png", choices: nine }), 400],
  ["duplicate choices", request({ imageDataUrl: IMAGE, choices: [...nine.slice(0, 8), "r1c1"] }), 400],
  ["wrong choice count", request({ imageDataUrl: IMAGE, choices: nine.slice(0, 8) }), 400],
  ["oversized image", request({ imageDataUrl: `data:image/png;base64,${"A".repeat(4 * 1024 * 1024 * 1.4)}`, choices: nine }), 413],
])("rejects %s without calling OpenAI", async (_name, req, status) => {
  const openAiFetch = openAiReturning(choiceAnswer("r1c1"));
  const { handler } = setup(openAiFetch);
  const response = await handler.fetch(req, env(undefined));
  expect(response.status).toBe(status);
  expect(openAiFetch).not.toHaveBeenCalled();
});

test.each([
  ["refusal", openAiReturning({ answers: [{ type: "refusal", name: "odd_cell" }] }), "refused"],
  ["invalid choice", openAiReturning(choiceAnswer("r9c9")), "invalid_choice"],
  ["rate limit", openAiReturning({ error: { message: "slow down" } }, 429), "rate_limited"],
  ["5xx", openAiReturning({ error: { message: "boom" } }, 503), "upstream_error"],
  ["malformed body", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })), "invalid_response"],
  ["network failure", vi.fn().mockRejectedValue(new TypeError("fetch failed")), "network_error"],
])("maps %s to a stable error with sanitized detail", async (_name, openAiFetch, errorCode) => {
  const { handler, logs, game } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: nine }), env(game));
  expect(response.status).toBe(200);
  const body = (await response.json()) as WorkerDecisionResponse;
  expect(body).toMatchObject({ status: "error", choice: null, errorCode });
  if (errorCode !== "network_error" && errorCode !== "refused" && errorCode !== "invalid_choice") {
    expect(body.detail).toBeTruthy();
  }
  expect(JSON.stringify(body)).not.toContain(OPENAI_KEY);
  expect(logs.some((line) => line.includes("game_openai_proxy"))).toBe(true);
  expect(openAiFetch).toHaveBeenCalledTimes(1);
});

test("returns ai_unconfigured when GAME binding is missing", async () => {
  const openAiFetch = openAiReturning(choiceAnswer("r1c1"));
  const { handler } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: nine }), env(undefined));
  expect(((await response.json()) as WorkerDecisionResponse).errorCode).toBe("ai_unconfigured");
  expect(openAiFetch).not.toHaveBeenCalled();
});
