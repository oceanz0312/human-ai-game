// @vitest-environment node
import { requestOddCell } from "@/server/decisions/openai";

const IMAGE = `data:image/png;base64,${Buffer.from("fake-png-bytes").toString("base64")}`;
const nine = Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`);
const config = { apiKey: "sk-test-key-should-never-appear-in-output", baseUrl: "https://api.openai.com/v1", model: "gpt-6-luna", timeoutMs: 5000 };

test.each([
  [401, { error: { message: "Incorrect API key provided" } }, "invalid_response"],
  [400, { error: { message: "Invalid schema for questions[0]" } }, "invalid_response"],
  [503, { error: { message: "boom" } }, "upstream_error"],
])("maps OpenAI HTTP %i to %s with sanitized detail", async (status, body, errorCode) => {
  const logs: Record<string, string | number | null>[] = [];
  const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  const outcome = await requestOddCell(
    { imageDataUrl: IMAGE, choices: nine },
    config,
    { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => Date.now(), log: (entry) => logs.push(entry) },
  );
  expect(outcome.ok).toBe(false);
  if (outcome.ok) return;
  expect(outcome.errorCode).toBe(errorCode);
  expect(outcome.detail).toMatch(new RegExp(`HTTP ${status}`));
  expect(outcome.detail).toMatch(/Incorrect API key|Invalid schema|boom/);
  expect(JSON.stringify(outcome)).not.toContain("sk-test-key");
  expect(logs.some((entry) => entry.kind === "openai_http_error")).toBe(true);
});

test("maps OpenAI region block to region_unsupported", async () => {
  const body = {
    error: {
      code: "unsupported_country_region_territory",
      message: "Country, region, or territory not supported",
    },
  };
  const logs: Record<string, string | number | null>[] = [];
  const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 403 }));
  const outcome = await requestOddCell(
    { imageDataUrl: IMAGE, choices: nine },
    config,
    { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => Date.now(), log: (entry) => logs.push(entry) },
  );
  expect(outcome.ok).toBe(false);
  if (outcome.ok) return;
  expect(outcome.errorCode).toBe("region_unsupported");
  expect(outcome.detail).toMatch(/HTTP 403/);
  expect(logs.some((entry) => entry.kind === "openai_region_blocked")).toBe(true);
});

test("maps malformed JSON body to invalid_response with preview", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>bad</html>", { status: 200 }));
  const outcome = await requestOddCell({ imageDataUrl: IMAGE, choices: nine }, config, { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => Date.now() });
  expect(outcome.ok).toBe(false);
  if (outcome.ok) return;
  expect(outcome.errorCode).toBe("invalid_response");
  expect(outcome.detail).toMatch(/non-JSON body/);
  expect(outcome.detail).toMatch(/html/);
});
