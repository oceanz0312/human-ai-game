// @vitest-environment node
import { internalOpenAiDecideRequestSchema, workerDecisionResponseSchema } from "@/server/decisions/contracts";
import { requestOddCell } from "@/server/decisions/openai";
import { workerResultFromOpenAiOutcome } from "@/server/decisions/openai-outcome";

const IMAGE = `data:image/png;base64,${Buffer.from("x").toString("base64")}`;
const nine = Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`);

test("internal OpenAI proxy contract maps region block to region_unsupported", async () => {
  const openAiFetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: { code: "unsupported_country_region_territory", message: "Country, region, or territory not supported" },
      }),
      { status: 403 },
    ),
  );
  const requestId = "req-proxy-1";
  const input = internalOpenAiDecideRequestSchema.parse({ requestId, imageDataUrl: IMAGE, choices: nine });
  const outcome = await requestOddCell(input, { apiKey: "sk-test", baseUrl: "https://api.openai.com/v1", model: "gpt-6-luna", timeoutMs: 5000 }, {
    fetchImpl: openAiFetch as unknown as typeof fetch,
    now: () => Date.now(),
  });
  const result = workerResultFromOpenAiOutcome(outcome, requestId, (errorCode, modelElapsedMs = 0, detail = null) =>
    workerDecisionResponseSchema.parse({
      status: "error",
      choice: null,
      confidence: null,
      probabilities: {},
      modelElapsedMs,
      errorCode,
      detail,
      requestId,
    }),
  );
  expect(result.errorCode).toBe("region_unsupported");
  expect(result.detail).toMatch(/HTTP 403/);
});
