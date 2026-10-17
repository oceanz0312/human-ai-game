import { expect, test } from "vitest";
import { buildAiEventSteps } from "@/game/ai-activity";
import { danmakuFromActivitySteps } from "@/game/danmaku-messages";
import type { RoundReveal } from "@/game/contracts";

test("play timeline is one humanized line per real event and never reveals the cell or time", () => {
  const events = [
    { event: "image" as const, at: 1_000 },
    { event: "sent" as const, at: 1_010 },
    { event: "answered" as const, at: 1_900 },
  ];
  const steps = buildAiEventSteps(events);
  expect(steps.map((s) => s.label)).toEqual(["AI 看到了图片", "AI 开始分析", "AI 已作答 · 答案已封存"]);
  const text = danmakuFromActivitySteps(steps).map((m) => m.text).join(" ");
  expect(text).not.toMatch(/r\d+c\d|概率|Worker|凭证|签发|0\.9/);
  expect(text).not.toMatch(/已接受/);
});

test("in-flight analysis stays active and errors are humanized", () => {
  expect(buildAiEventSteps([{ event: "image", at: 1 }, { event: "sent", at: 2 }]).at(-1)).toMatchObject({ label: "AI 正在分析…", state: "active" });
  expect(buildAiEventSteps([{ event: "sent", at: 2 }, { event: "error", at: 3, code: "ai_timeout" }]).at(-1)).toMatchObject({ label: "AI 没在时间内作答", state: "error" });
});

test("reveal timeline shows the AI's time and verdict", () => {
  const reveal = { ai: { status: "complete", correct: false, elapsedMs: 920 } } as unknown as RoundReveal;
  const steps = buildAiEventSteps([{ event: "sent", at: 2 }, { event: "answered", at: 900 }], { reveal });
  expect(steps.at(-1)).toMatchObject({ label: "AI 给出答案", detail: "0.92s · 看错了" });
});
