// @vitest-environment node
import { createWorkerHandler, type WorkerEnv } from "../../workers/decisions/src/index";

const SECRET = "test-shared-secret-with-enough-entropy";
const OPENAI_KEY = "sk-test-openai-key-should-never-leak";
const env: WorkerEnv = { OPENAI_API_KEY: OPENAI_KEY, DECISIONS_WORKER_SHARED_SECRET: SECRET, OPENAI_DECISIONS_TIMEOUT_MS: "200" };
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

function setup(fetchImpl: ReturnType<typeof vi.fn>) {
  const logs: string[] = [];
  let tick = 1000;
  const handler = createWorkerHandler({ fetchImpl: fetchImpl as unknown as typeof fetch, now: () => (tick += 7), log: (entry) => logs.push(JSON.stringify(entry)), randomId: () => "req-1" });
  return { handler, logs };
}

test("forwards a validated 9-cell puzzle without exposing secrets", async () => {
  const openAiFetch = openAiReturning(choiceAnswer("r2c2"));
  const { handler, logs } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: nine }), env);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("X-Request-Id")).toBe("req-1");
  expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  const body = await response.json();
  expect(body).toMatchObject({ status: "complete", choice: "r2c2", confidence: 0.91, errorCode: null, requestId: "req-1" });
  expect(body.modelElapsedMs).toBeGreaterThan(0);
  expect(JSON.stringify(body)).not.toContain(OPENAI_KEY);

  const [url, init] = openAiFetch.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/decisions");
  expect(init.headers.Authorization).toBe(`Bearer ${OPENAI_KEY}`);
  const sent = JSON.parse(init.body);
  expect(sent.model).toBe("gpt-6-luna");
  expect(sent.input).toEqual([{ type: "message", role: "user", content: [{ type: "input_image", image_url: IMAGE, detail: "high" }] }]);
  expect(sent.questions).toHaveLength(1);
  expect(sent.questions[0]).toMatchObject({ type: "choice", name: "odd_cell" });
  expect(sent.questions[0].choices).toHaveLength(9);
  expect(sent.questions[0].choices[4]).toEqual({ value: "r2c2", description: "row 2, column 2" });
  expect(JSON.stringify(sent)).not.toMatch(/correct/i);

  const logText = logs.join("\n");
  expect(logText).not.toContain(SECRET);
  expect(logText).not.toContain(OPENAI_KEY);
  expect(logText).not.toContain("base64");
  expect(JSON.parse(logs[0])).toMatchObject({ requestId: "req-1", status: 200, choiceCount: 9, errorCode: null });
});

test("accepts 81 candidates for 9×9 levels", async () => {
  const openAiFetch = openAiReturning(choiceAnswer("r5c7"));
  const { handler } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: eightyOne }), env);
  expect((await response.json()).choice).toBe("r5c7");
  expect(JSON.parse(openAiFetch.mock.calls[0][1].body).questions[0].choices).toHaveLength(81);
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
  const response = await handler.fetch(req, env);
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
])("maps %s to a stable error without leaking the upstream body", async (_name, openAiFetch, errorCode) => {
  const { handler } = setup(openAiFetch);
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: nine }), env);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ status: "error", choice: null, errorCode });
  expect(JSON.stringify(body)).not.toMatch(/slow down|boom|html/);
  expect(openAiFetch).toHaveBeenCalledTimes(1);
});

test("times out a slow OpenAI call once without retrying", async () => {
  const openAiFetch = vi.fn().mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  );
  const handler = createWorkerHandler({ fetchImpl: openAiFetch as unknown as typeof fetch, log: () => undefined });
  const response = await handler.fetch(request({ imageDataUrl: IMAGE, choices: nine }), { ...env, OPENAI_DECISIONS_TIMEOUT_MS: "50" });
  expect((await response.json()).errorCode).toBe("upstream_timeout");
  expect(openAiFetch).toHaveBeenCalledTimes(1);
});
