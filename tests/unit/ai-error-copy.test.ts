import { describe, expect, test } from "vitest";
import { aiErrorRevealTitle } from "@/game/ai-error-copy";
import { describeReveal } from "@/game/reveal-copy";
import type { RoundReveal } from "@/game/contracts";

const base: RoundReveal = {
  id: "r",
  level: 1,
  gridSize: 3,
  imageUrl: "/levels/v1/01.png",
  correctChoice: "r1c1",
  human: { status: "correct", choice: "r1c1", elapsedMs: 1000 },
  ai: {
    status: "error",
    correct: null,
    elapsedMs: null,
    refused: false,
    choice: null,
    confidence: null,
    probabilities: null,
    modelElapsedMs: 3,
    errorCode: "region_unsupported",
    errorDetail: "HTTP 403 · unsupported_country_region_territory",
  },
  winner: "human",
  fasterThanAi: false,
};

test("region_unsupported uses friendly Chinese reveal title", () => {
  expect(aiErrorRevealTitle("region_unsupported")).toBe("AI 不可用 · 地区限制");
  const copy = describeReveal(base);
  expect(copy.title).toBe("AI 不可用 · 地区限制");
  expect(copy.detail).toMatch(/OpenAI 不支持/);
  expect(copy.detail).toMatch(/HTTP 403/);
});
