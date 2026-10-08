import type { RoundReveal } from "@/game/contracts";
import { describeReveal, shareHeadline } from "@/game/reveal-copy";
import { posterHeadline } from "@/lib/poster";
import { countdown } from "@/lib/format";

test("share headlines follow the approved priority", () => {
  expect(shareHeadline({ reachedLevel: 8, fasterThanAiCount: 3, cleared: false })).toBe("我有 3 关比 AI 更快");
  expect(shareHeadline({ reachedLevel: 5, fasterThanAiCount: 0, cleared: false })).toBe("我到达了第 5 关");
  expect(shareHeadline({ reachedLevel: 20, fasterThanAiCount: 4, cleared: true })).toBe("我通关了 HUMAN / AI");
});

test("poster headline underlines the key number", () => {
  expect(posterHeadline({ reachedLevel: 8, fasterThanAiCount: 3, cleared: false })[0]).toContainEqual({ text: "3", underline: true });
  expect(posterHeadline({ reachedLevel: 5, fasterThanAiCount: 0, cleared: false })[1]).toContainEqual({ text: "5", underline: true });
});

const base: RoundReveal = {
  id: "r",
  level: 6,
  gridSize: 9,
  human: { status: "correct", choice: "r5c7", elapsedMs: 2480 },
  ai: { status: "complete", correct: true, elapsedMs: 2910 },
  winner: "human",
  fasterThanAi: true,
};

test("reveal copy covers every outcome with the allowed titles", () => {
  expect(describeReveal(base)).toMatchObject({ title: "你赢了", detail: "双方正确 · 你快了 0.43 秒", symbol: "✓" });
  expect(describeReveal({ ...base, ai: { status: "complete", correct: true, elapsedMs: 1900 }, winner: "ai", fasterThanAi: false })).toMatchObject({
    title: "AI 赢了",
    detail: "双方正确 · AI 快了 0.58 秒",
  });
  expect(describeReveal({ ...base, human: { status: "timeout", choice: null, elapsedMs: 7000 }, winner: "ai" })).toMatchObject({ title: "AI 赢了", detail: "你超时了 · 失去 1 条命" });
  expect(describeReveal({ ...base, ai: { status: "error", correct: null, elapsedMs: null }, winner: "human" })).toMatchObject({ title: "AI 掉线", symbol: "—" });
  expect(describeReveal({ ...base, ai: { status: "running", correct: null, elapsedMs: null }, winner: "pending" }).title).toBe("AI 仍在判断");
  expect(
    describeReveal({ ...base, human: { status: "incorrect", choice: "r1c1", elapsedMs: 1000 }, ai: { status: "complete", correct: false, elapsedMs: 900 }, winner: "none" }).title,
  ).toBe("无人获胜");
});

test("countdown never shows negative values", () => {
  expect(countdown(4823)).toBe("04.82");
  expect(countdown(-20)).toBe("00.00");
});
