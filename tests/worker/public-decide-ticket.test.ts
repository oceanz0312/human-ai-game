// @vitest-environment node
import { signDecisionTicket } from "@/server/decisions/ticket";
import { createWorkerHandler } from "../../workers/decisions/src/index";
import { createMemoryTicketStore } from "../../workers/decisions/src/ticket-store";
import type { WorkerEnv } from "../../workers/decisions/src/env";

const SECRET = "public-ticket-secret-with-enough-entropy-123456789";
const OPENAI_KEY = "sk-test-openai-key-should-never-leak";
const IMAGE_BYTES = Buffer.from("level-image-bytes");
const IMAGE_SHA256 = "5c4fbade79b44684d4d651782051ce05c092d7c106d00c32e6c1312319ce3851";

async function makeTicket(overrides: Partial<{ exp: number; imageSha256: string }> = {}) {
  return signDecisionTicket(
    {
      v: 1,
      jti: "22222222-2222-4222-8222-222222222222",
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

function env(): WorkerEnv {
  return {
    OPENAI_API_KEY: OPENAI_KEY,
    DECISIONS_WORKER_SHARED_SECRET: SECRET,
    PUBLIC_BASE_URL: "https://game.test",
    OPENAI_DECISIONS_TIMEOUT_MS: "200",
  };
}

test("accepts a valid ticket from an allowed origin and hides the AI choice from the browser", async () => {
  const gameReports: unknown[] = [];
  const openAiFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ answers: [{ type: "choice", name: "odd_cell", choice: "r2c2", confidence: 0.8, probabilities: [{ value: "r2c2", probability: 0.8 }] }] })),
  );
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/internal/ai-result")) {
      gameReports.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ accepted: true }), { status: 200 });
    }
    if (url.endsWith("/levels/v1/01.png")) {
      return new Response(IMAGE_BYTES, { status: 200, headers: { "Content-Type": "image/png" } });
    }
    return openAiFetch(input, init);
  }) as unknown as typeof fetch;

  const handler = createWorkerHandler({ fetchImpl, ticketStore: createMemoryTicketStore(), randomId: () => "req-public-1", now: () => 1_500_000 });
  const ticket = await makeTicket();
  const response = await handler.fetch(
    new Request("https://worker.test/v1/decide-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://game.test" },
      body: JSON.stringify({ ticket }),
    }),
    env(),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://game.test");
  const body = (await response.json()) as { status: string; requestId: string; errorCode: string | null; choice?: string };
  expect(body).toMatchObject({ status: "complete", requestId: "req-public-1", errorCode: null });
  expect(body.choice).toBeUndefined();
  expect(gameReports[0]).toMatchObject({ roundId: "round-abcdefgh", result: { choice: "r2c2", status: "complete" } });
});

test.each([
  ["expired", async () => makeTicket({ exp: 500_000 })],
  ["replayed", async () => makeTicket()],
])("rejects %s tickets", async (_label, ticketFactory) => {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("/levels/v1/01.png")) return new Response(IMAGE_BYTES, { status: 200 });
    return new Response(JSON.stringify({ answers: [{ type: "choice", name: "odd_cell", choice: "r1c1", confidence: 1, probabilities: [] }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const store = createMemoryTicketStore();
  const handler = createWorkerHandler({ fetchImpl, ticketStore: store, now: () => 1_500_000 });
  const ticket = await ticketFactory();
  const request = () =>
    handler.fetch(
      new Request("https://worker.test/v1/decide-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://game.test" },
        body: JSON.stringify({ ticket }),
      }),
      env(),
    );
  const first = await request();
  if (_label === "expired") {
    expect(first.status).toBe(401);
    return;
  }
  expect(first.status).toBe(200);
  const second = await request();
  expect(second.status).toBe(409);
  expect(((await second.json()) as { errorCode: string }).errorCode).toBe("ticket_replayed");
});

test("blocks disallowed origins and tampered tickets", async () => {
  const handler = createWorkerHandler({ fetchImpl: vi.fn() as unknown as typeof fetch, ticketStore: createMemoryTicketStore(), now: () => 1_500_000 });
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
