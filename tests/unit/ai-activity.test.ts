import { describe, expect, test } from "vitest";
import { buildAiActivitySteps } from "@/game/ai-activity";
import type { AiNetworkProgress } from "@/lib/ai-dispatch";

const base = (overrides: Partial<AiNetworkProgress>): AiNetworkProgress => ({
  ticketIssuedAt: 1_000,
  requestSentAt: 1_100,
  responseReceivedAt: null,
  requestId: null,
  errorCode: null,
  modelElapsedMs: null,
  totalElapsedMs: null,
  imageLoadMs: null,
  ...overrides,
});

describe("buildAiActivitySteps", () => {
  test("shows waiting label while in flight", () => {
    const steps = buildAiActivitySteps(base({ responseReceivedAt: null }));
    expect(steps.some((s) => s.id === "wait" && s.state === "active")).toBe(true);
    expect(steps.find((s) => s.id === "wait")?.detail).toMatch(/等待中/);
    expect(steps.find((s) => s.id === "wait")?.detail).not.toMatch(/^思考/);
  });

  test("includes image step when imageLoadMs is known", () => {
    const steps = buildAiActivitySteps(
      base({ responseReceivedAt: 2_000, imageLoadMs: 40, modelElapsedMs: 500, totalElapsedMs: 900 }),
    );
    expect(steps.find((s) => s.id === "image")?.timestamp).toBe(1_140);
    expect(steps.find((s) => s.id === "response")?.detail).toMatch(/模型 500ms/);
    expect(steps.find((s) => s.id === "response")?.detail).toMatch(/全程 900ms/);
  });
});
