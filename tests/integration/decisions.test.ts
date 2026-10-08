// @vitest-environment node
import { createCloudflareDecisionClient } from "@/server/decisions/client";
import { createWorkerHandler } from "../../workers/decisions/src/index";

const SECRET = "shared-secret-for-tests-0123456789";
const IMAGE = `data:image/png;base64,${Buffer.from("png").toString("base64")}`;
const choices = Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`);

function clientAgainstWorker(openAiFetch: ReturnType<typeof vi.fn>, workerSecret = SECRET) {
  const worker = createWorkerHandler({ fetchImpl: openAiFetch as unknown as typeof fetch, log: () => undefined });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) =>
    worker.fetch(new Request(input, init), { OPENAI_API_KEY: "sk-test", DECISIONS_WORKER_SHARED_SECRET: workerSecret })) as typeof fetch;
  let tick = 0;
  return createCloudflareDecisionClient({ url: "https://worker.test", sharedSecret: SECRET, fetchImpl, now: () => (tick += 250) });
}

test("game service → Worker → OpenAI returns a normalized answer with end-to-end timing", async () => {
  const openAiFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ answers: [{ type: "choice", name: "odd_cell", choice: "r3c1", confidence: 0.8, probabilities: [{ value: "r3c1", probability: 0.8 }] }] })),
  );
  const result = await clientAgainstWorker(openAiFetch).decide({ imageDataUrl: IMAGE, choices }, new AbortController().signal);
  expect(result).toMatchObject({ status: "complete", choice: "r3c1", confidence: 0.8, probabilities: { r3c1: 0.8 }, errorCode: null });
  expect(result.elapsedMs).toBe(250);
});

test("a Worker authentication failure becomes an AI error", async () => {
  const openAiFetch = vi.fn();
  const result = await clientAgainstWorker(openAiFetch, "a-different-secret").decide({ imageDataUrl: IMAGE, choices }, new AbortController().signal);
  expect(result).toMatchObject({ status: "error", errorCode: "unauthorized" });
  expect(openAiFetch).not.toHaveBeenCalled();
});

test("an unreachable Worker or malformed response becomes an AI error", async () => {
  const down = createCloudflareDecisionClient({ url: "https://worker.test", sharedSecret: SECRET, fetchImpl: (async () => Promise.reject(new TypeError("down"))) as typeof fetch });
  expect((await down.decide({ imageDataUrl: IMAGE, choices }, new AbortController().signal)).errorCode).toBe("worker_unavailable");

  const garbage = createCloudflareDecisionClient({ url: "https://worker.test", sharedSecret: SECRET, fetchImpl: (async () => new Response(JSON.stringify({ hello: 1 }))) as typeof fetch });
  expect((await garbage.decide({ imageDataUrl: IMAGE, choices }, new AbortController().signal)).errorCode).toBe("invalid_response");

  const outside = createCloudflareDecisionClient({
    url: "https://worker.test",
    sharedSecret: SECRET,
    fetchImpl: (async () =>
      new Response(JSON.stringify({ status: "complete", choice: "r9c9", confidence: 1, probabilities: {}, modelElapsedMs: 1, errorCode: null, requestId: "x" }))) as typeof fetch,
  });
  expect((await outside.decide({ imageDataUrl: IMAGE, choices }, new AbortController().signal)).errorCode).toBe("invalid_choice");
});

test("the browser bundle never references the Worker, OpenAI, or their secrets", async () => {
  const { readFile } = await import("node:fs/promises");
  const { globSync } = await import("node:fs");
  const clientFiles = [...globSync("src/components/**/*.tsx"), ...globSync("src/lib/**/*.ts"), ...globSync("src/levels/**/*.ts"), "src/app/page.tsx"];
  for (const file of clientFiles) {
    const source = await readFile(file, "utf8");
    expect(source, file).not.toMatch(/DECISIONS_WORKER|OPENAI_API_KEY|api\.openai\.com|workers\.dev|server\/decisions/);
  }
});
