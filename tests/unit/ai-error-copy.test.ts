import { expect, test } from "vitest";
import { aiErrorLine, aiErrorRevealTitle } from "@/game/ai-error-copy";
import { describeReveal } from "@/game/reveal-copy";
import type { RoundReveal } from "@/game/contracts";
import { translate } from "@/i18n/messages";

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

test("AI errors use humanized copy and never leak codes or vendor details", () => {
  const copy = describeReveal(base);
  expect(copy.title).toBe("AI 掉线了");
  expect(copy.detail).toBe("你答对了 · 本关按你的结果算");
  expect(`${copy.title}${copy.detail}`).not.toMatch(/OpenAI|HTTP|region|Worker|_/);
  expect(aiErrorRevealTitle("ai_timeout")).toBe("AI 超时了");
  for (const code of ["ai_timeout", "rate_limited", "region_unsupported", "ai_unconfigured", "upstream_error", "refused", null]) {
    expect(aiErrorLine(code)).not.toMatch(/[a-z]_[a-z]|Worker|OpenAI|命|条/);
    expect(translate("en", aiErrorLine(code))).not.toMatch(/[\u4e00-\u9fff]|\blives?\b/);
  }
});
