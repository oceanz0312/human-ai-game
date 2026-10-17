import { describe, expect, test } from "vitest";
import { aiStatusLabel, buildAiEventSteps } from "@/game/ai-activity";
import type { AiEvent } from "@/game/contracts";

const image: AiEvent = { event: "image", at: 1_000 };
const sent: AiEvent = { event: "sent", at: 1_010 };
const answered: AiEvent = { event: "answered", at: 2_000 };

describe("buildAiEventSteps", () => {
  test("only real events produce lines; no cell or time before reveal", () => {
    const steps = buildAiEventSteps([image, sent], { locale: "zh" });
    expect(steps.map((s) => s.label)).toEqual(["AI 看到了图片", "AI 正在分析…"]);
    expect(steps[1].state).toBe("active");
    const done = buildAiEventSteps([image, sent, answered], { locale: "zh" });
    expect(done.map((s) => s.label)).toEqual(["AI 看到了图片", "AI 开始分析", "AI 已作答 · 答案已封存"]);
    expect(JSON.stringify(done)).not.toMatch(/r\dc\d|\d\.\d+s/);
  });

  test("waiting shows a real elapsed counter on the analysing line", () => {
    const steps = buildAiEventSteps([image, sent], { locale: "zh", waitingMs: 2_340 });
    expect(steps[1].detail).toContain("2.3");
  });

  test("never mentions accepting a challenge", () => {
    const text = JSON.stringify([...buildAiEventSteps([image, sent, answered], { locale: "zh" }), ...buildAiEventSteps([image, sent, answered], { locale: "en" })]);
    expect(text).not.toMatch(/接受挑战|accepted the challenge/i);
  });
});

describe("aiStatusLabel", () => {
  test("locked + waiting shows the counter; answered stays sealed", () => {
    expect(aiStatusLabel([image, sent], { locale: "zh", locked: true, waitingMs: 1_500 })).toMatch(/^AI 还在分析 1\.5/);
    expect(aiStatusLabel([image, sent, answered], { locale: "zh", locked: true })).toBe("AI 已作答 🔒");
    expect(aiStatusLabel([], { locale: "zh" })).toBe("准备中");
  });
});
