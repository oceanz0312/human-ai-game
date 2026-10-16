// @vitest-environment node
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createCloudflareDecisionClient } from "@/server/decisions/client";
import { createWorkerHandler } from "../../workers/decisions/src/index";
import { createGameBindingMock } from "../worker/game-binding-mock";

const SECRET = "shared-secret-for-tests-0123456789";
const IMAGE = `data:image/png;base64,${Buffer.from("png").toString("base64")}`;
const choices = Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`);

function clientAgainstWorker(openAiFetch: ReturnType<typeof vi.fn>, workerSecret = SECRET) {
  const game = createGameBindingMock(new Uint8Array(0), [], openAiFetch);
  const worker = createWorkerHandler({ fetchImpl: vi.fn() as unknown as typeof fetch, log: () => undefined });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) =>
    worker.fetch(new Request(input, init), { DECISIONS_WORKER_SHARED_SECRET: workerSecret, GAME: game })) as typeof fetch;
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

function collectSourceFiles(root: string, suffix: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) stack.push(path);
      else if (path.endsWith(suffix)) out.push(path);
    }
  }
  return out;
}

test("the browser bundle never embeds OpenAI keys or server decision secrets", async () => {
  const { readFile } = await import("node:fs/promises");
  const clientFiles = [
    ...collectSourceFiles("src/components", ".tsx"),
    ...collectSourceFiles("src/lib", ".ts"),
    ...collectSourceFiles("src/levels", ".ts"),
    ...collectSourceFiles("src/app/[locale]", ".tsx"),
    ...collectSourceFiles("src/i18n", ".ts"),
  ];
  for (const file of clientFiles) {
    const source = await readFile(file, "utf8");
    expect(source, file).not.toMatch(/OPENAI_API_KEY|api\.openai\.com|DECISIONS_WORKER_SHARED_SECRET|server\/decisions/);
  }
});
