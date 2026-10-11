// @vitest-environment node
import { signDecisionTicket } from "@/server/decisions/ticket";
import { createWorkerHandler } from "../../workers/decisions/src/index";
import { createMemoryTicketStore } from "../../workers/decisions/src/ticket-store";
import type { WorkerEnv } from "../../workers/decisions/src/env";

const SECRET = "public-ticket-secret-with-enough-entropy-123456789";
const OPENAI_KEY = "sk-test-openai-key-should-never-leak";
const IMAGE_BYTES = Buffer.from("level-image-bytes");
const IMAGE_SHA256 = "5c4fbade79b44684d4d651782051ce05c092d7c106d00c32e6c1312319ce3851";
const FIXED_NOW = 1_500_000;

async function makeTicket(overrides: Partial<{ exp: number; imageSha256: string; jti: string }> = {}) {
  return signDecisionTicket(
    {
      v: 1,
      jti: overrides.jti ?? "22222222-2222-4222-8222-222222222222",
      roundId: "round-abcdefgh",
      sessionId: "session-abcdefgh",
      level: 1,
      imageSha256: overrides.imageSha256 ?? IMAGE_SHA256,
      choices: Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`),
      iat: 1_000_000,
      exp: overrides.exp ?? 2_000_000,
    },
    SECRET,
  );
}

function mockGameFetcher(imageBytes: Uint8Array, gameReports: unknown[]) {
  return {
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/api/internal/levels/")) {
        return new Response(Buffer.from(imageBytes), { status: 200, headers: { "Content-Type": "image/png" } });
      }
      if (url.includes("/api/internal/ai-result")) {
        const body = input instanceof Request ? await input.clone().text() : String(init?.body ?? "");
        gameReports.push(JSON.parse(body));
        return new Response(JSON.stringify({ accepted: true }), { status: 200 });
      }
      return new Response("missing", { status: 404 });
    }),
  } as unknown as Fetcher;
}

function env(game?: Fetcher): WorkerEnv {
  return {
    OPENAI_API_KEY: OPENAI_KEY,
    DECISIONS_WORKER_SHARED_SECRET: SECRET,
    PUBLIC_BASE_URL: "https://game.test",
    OPENAI_DECISIONS_TIMEOUT_MS: "200",
    GAME: game,
  };
}

test("accepts a valid ticket via GAME binding without public PNG fetch", async () => {
  const gameReports: unknown[] = [];
  const game = mockGameFetcher(IMAGE_BYTES, gameReports);
  const openAiFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ answers: [{ type: "choice", name: "odd_cell", choice: "r2c2", confidence: 0.8, probabilities: [{ value: "r2c2", probability: 0.8 }] }] })),
  );
  const fetchImpl = vi.fn(openAiFetch) as unknown as typeof fetch;
  const handler = createWorkerHandler({ fetchImpl, ticketStore: createMemoryTicketStore(), randomId: () => "req-public-1", now: () => FIXED_NOW });
  const ticket = await makeTicket();
  const response = await handler.fetch(
    new Request("https://worker.test/v1/decide-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://game.test" },
      body: JSON.stringify({ ticket }),
    }),
    env(game),
  );
  expect(response.status).toBe(200);
  const gameFetch = vi.mocked(game.fetch);
  expect(gameFetch).toHaveBeenCalled();
  const gameUrl = (gameFetch.mock.calls[0][0] as Request).url;
  expect(gameUrl).toContain("/api/internal/levels/1/image");
  expect(fetchImpl).not.toHaveBeenCalledWith(expect.stringContaining("/levels/v1/01.png"), expect.anything());
  const body = (await response.json()) as { status: string; requestId: string; errorCode: string | null; choice?: string };
  expect(body).toMatchObject({ status: "complete", requestId: "req-public-1", errorCode: null });
  expect(body.choice).toBeUndefined();
  expect(gameReports[0]).toMatchObject({ roundId: "round-abcdefgh", result: { choice: "r2c2", status: "complete" } });
});

test("replayed still-valid ticket returns 409 ticket_replayed (not 401)", async () => {
  const gameReports: unknown[] = [];
  const game = mockGameFetcher(IMAGE_BYTES, gameReports);
  const openAiFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ answers: [{ type: "choice", name: "odd_cell", choice: "r1c1", confidence: 1, probabilities: [] }] })),
  );
  const handler = createWorkerHandler({
    fetchImpl: openAiFetch as unknown as typeof fetch,
    ticketStore: createMemoryTicketStore(),
    now: () => FIXED_NOW,
  });
  const ticket = await makeTicket({ jti: "33333333-3333-4333-8333-333333333333" });
  const request = () =>
    handler.fetch(
      new Request("https://worker.test/v1/decide-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://game.test" },
        body: JSON.stringify({ ticket }),
      }),
      env(game),
    );
  expect((await request()).status).toBe(200);
  const replay = await request();
  expect(replay.status).toBe(409);
  expect(((await replay.json()) as { errorCode: string }).errorCode).toBe("ticket_replayed");
});

test("expired ticket returns 401 ticket_expired", async () => {
  const handler = createWorkerHandler({ fetchImpl: vi.fn() as unknown as typeof fetch, ticketStore: createMemoryTicketStore(), now: () => FIXED_NOW });
  const ticket = await makeTicket({ exp: 500_000 });
  const response = await handler.fetch(
    new Request("https://worker.test/v1/decide-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://game.test" },
      body: JSON.stringify({ ticket }),
    }),
    env(),
  );
  expect(response.status).toBe(401);
  expect(((await response.json()) as { errorCode: string }).errorCode).toBe("ticket_expired");
});

test("GAME binding image failure returns level_image_unavailable (not network_error)", async () => {
  const gameReports: unknown[] = [];
  const game = {
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/api/internal/levels/")) return new Response("down", { status: 503 });
      if (url.includes("/api/internal/ai-result")) {
        const body = input instanceof Request ? await input.clone().text() : String(init?.body ?? "");
        gameReports.push(JSON.parse(body));
        return new Response(JSON.stringify({ accepted: true }), { status: 200 });
      }
      return new Response("missing", { status: 404 });
    }),
  } as unknown as Fetcher;
  const logs: string[] = [];
  const handler = createWorkerHandler({
    fetchImpl: vi.fn() as unknown as typeof fetch,
    ticketStore: createMemoryTicketStore(),
    log: (entry) => logs.push(JSON.stringify(entry)),
    now: () => FIXED_NOW,
  });
  const ticket = await makeTicket({ jti: "44444444-4444-4444-8444-444444444444" });
  const response = await handler.fetch(
    new Request("https://worker.test/v1/decide-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://game.test" },
      body: JSON.stringify({ ticket }),
    }),
    env(game),
  );
  expect(response.status).toBe(502);
  expect(((await response.json()) as { errorCode: string }).errorCode).toBe("level_image_unavailable");
  expect(logs.some((line) => line.includes("level_image_load_failed"))).toBe(true);
  expect(gameReports[0]).toMatchObject({ result: { errorCode: "level_image_unavailable" } });
});

test("blocks disallowed origins and tampered tickets", async () => {
  const handler = createWorkerHandler({ fetchImpl: vi.fn() as unknown as typeof fetch, ticketStore: createMemoryTicketStore(), now: () => FIXED_NOW });
  const ticket = await makeTicket();
  const wrongOrigin = await handler.fetch(
    new Request("https://worker.test/v1/decide-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.test" },
      body: JSON.stringify({ ticket }),
    }),
    env(),
  );
  expect(wrongOrigin.headers.get("Access-Control-Allow-Origin")).toBeNull();

  const tampered = `${ticket.slice(0, -2)}xx`;
  const badTicket = await handler.fetch(
    new Request("https://worker.test/v1/decide-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://game.test" },
      body: JSON.stringify({ ticket: tampered }),
    }),
    env(),
  );
  expect(badTicket.status).toBe(401);
});
