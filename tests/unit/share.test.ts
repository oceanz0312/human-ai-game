import type { RoundReveal } from "@/game/contracts";
import { describeReveal, shareHeadline } from "@/game/reveal-copy";
import { POSTER_PALETTE, posterHeadline } from "@/lib/poster";
import { accuracy, posterStats, shareCta, shareLine, shareOutcome } from "@/lib/share-copy";
import { readFileSync } from "node:fs";
import { countdown } from "@/lib/format";

test("share headlines follow the approved priority", () => {
  expect(shareHeadline({ reachedLevel: 8, fasterThanAiCount: 3, cleared: false })).toBe("我有 3 关比 AI 更快");
  expect(shareHeadline({ reachedLevel: 5, fasterThanAiCount: 0, cleared: false })).toBe("我到达了第 5 关");
  expect(shareHeadline({ reachedLevel: 20, fasterThanAiCount: 4, cleared: true })).toBe("我通关了 HUMAN VS AI");
});

const run = (o: Partial<{ reachedLevel: number; fasterThanAiCount: number; cleared: boolean; played: number; humanCorrect: number; aiCorrect: number }>) => ({
  reachedLevel: 5,
  fasterThanAiCount: 0,
  cleared: false,
  played: 6,
  humanCorrect: 3,
  aiCorrect: 5,
  ...o,
});

test("poster copy is framed around accuracy and the outcome", () => {
  expect(shareOutcome(run({ humanCorrect: 5, aiCorrect: 3 }))).toBe("win");
  expect(shareOutcome(run({ humanCorrect: 4, aiCorrect: 4 }))).toBe("tie");
  expect(shareOutcome(run({}))).toBe("loss");
  expect(shareOutcome(run({ cleared: true, humanCorrect: 1 }))).toBe("cleared");
  expect(posterHeadline(run({ humanCorrect: 5, aiCorrect: 3 }), "zh")).toEqual(["我比 AI", "更准"]);
  expect(posterHeadline(run({}), "en")).toEqual(["THE AI WAS", "SHARPER"]);
  expect(accuracy(2, 3)).toBe(67);
  expect(accuracy(0, 0)).toBeNull();
  expect(shareLine(run({ humanCorrect: 5, aiCorrect: 3 }), "zh")).toBe("我比 AI 更准 · 准确率 83% vs AI 50%");
  expect(shareLine(run({}), "zh")).toBe("AI 这局更准一点 · 准确率 50% vs AI 83%");
  expect(shareLine(run({ played: 0, humanCorrect: 0, aiCorrect: 0 }), "en")).toBe("THE AI WAS SHARPER");
  expect(shareCta("zh")).toBe("同一套题，你能比 AI 更准吗？");
});

test("zero counts are never bragged about", () => {
  const zh = posterStats(run({ fasterThanAiCount: 0 }), "zh");
  expect(zh.map((s) => s.label)).toEqual(["到达关卡", "答对"]);
  expect(posterStats(run({ fasterThanAiCount: 2 }), "zh").at(-1)).toEqual({ label: "抢先 AI", value: "2", unit: "关" });
  expect(posterStats(run({ played: 0, humanCorrect: 0 }), "en").map((s) => s.label)).toEqual(["LEVEL"]);
  expect(posterStats(run({ humanCorrect: 0 }), "zh").map((s) => s.label)).toEqual(["到达关卡"]);
  for (const locale of ["zh", "en"] as const) {
    for (const o of [{}, { fasterThanAiCount: 0, humanCorrect: 0 }, { cleared: true }]) {
      const text = [shareLine(run(o), locale), ...posterHeadline(run(o), locale), ...posterStats(run(o), locale).map((s) => `${s.label}${s.value}`)].join(" ");
      expect(text).not.toMatch(/命|条|life|lives|比 ?AI ?更快 ?0|0 ?关/i);
    }
  }
});

test("poster palette mirrors the pixel tokens", () => {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(tokens)?.[1]?.toLowerCase();
  expect(POSTER_PALETTE.ink).toBe(token("c-ink"));
  expect(POSTER_PALETTE.paper).toBe(token("c-paper"));
  expect(POSTER_PALETTE.humanText).toBe(token("c-human-text"));
  expect(POSTER_PALETTE.humanText).toBe("#c8003c");
  expect(POSTER_PALETTE.ai).toBe(token("c-ai"));
  expect(POSTER_PALETTE.aiText).toBe(token("c-ai-text"));
  expect(POSTER_PALETTE.hi).toBe(token("c-hi"));
  expect(POSTER_PALETTE.muted).toBe(token("c-muted"));
});

const aiExtras = {
  choice: null,
  confidence: null,
  probabilities: null,
  modelElapsedMs: null,
  errorCode: null,
  errorDetail: null,
} as const;

const base: RoundReveal = {
  id: "r",
  level: 6,
  gridSize: 9,
  imageUrl: "/levels/v1/06.png",
  correctChoice: "r5c7",
  human: { status: "correct", choice: "r5c7", elapsedMs: 2480 },
  ai: {
    status: "complete",
    correct: true,
    elapsedMs: 2910,
    refused: false,
    choice: "r5c7",
    confidence: 0.88,
    probabilities: { r5c7: 0.71, r1c1: 0.18 },
    modelElapsedMs: 2400,
    errorCode: null,
    errorDetail: null,
  },
  winner: "human",
  fasterThanAi: true,
};

test("reveal copy covers every outcome with the allowed titles", () => {
  expect(describeReveal(base)).toMatchObject({ title: "你赢了", detail: "双方正确 · 你快了 0.43 秒", symbol: "✓" });
  expect(describeReveal({ ...base, ai: { status: "complete", correct: true, elapsedMs: 1900, refused: false, ...aiExtras }, winner: "ai", fasterThanAi: false })).toMatchObject({
    title: "AI 赢了",
    detail: "双方正确 · AI 快了 0.58 秒",
  });
  expect(describeReveal({ ...base, human: { status: "timeout", choice: null, elapsedMs: 7000 }, winner: "ai" })).toMatchObject({ title: "AI 赢了", detail: "你超时了 · 用掉 1 次机会" });
  expect(describeReveal({ ...base, ai: { status: "error", correct: null, elapsedMs: null, refused: false, ...aiExtras, errorCode: "invalid_response" }, winner: "human" })).toMatchObject({
    title: "AI 掉线 · invalid_response",
    symbol: "—",
  });
  expect(describeReveal({ ...base, ai: { status: "running", correct: null, elapsedMs: null, refused: false, ...aiExtras }, winner: "pending" }).title).toBe("AI 仍在判断");
  expect(
    describeReveal({ ...base, human: { status: "incorrect", choice: "r1c1", elapsedMs: 1000 }, ai: { status: "complete", correct: false, elapsedMs: 900, refused: false, ...aiExtras }, winner: "none" }).title,
  ).toBe("无人获胜");
});

test("a Decisions refusal is a real AI loss, not an offline AI", () => {
  const refused = { status: "error", correct: null, elapsedMs: null, refused: true, ...aiExtras } as const;
  expect(describeReveal({ ...base, ai: refused, winner: "human", fasterThanAi: false })).toMatchObject({
    title: "你赢了",
    detail: "AI 放弃作答",
    aiValue: { tag: "放弃", time: null },
  });
  expect(describeReveal({ ...base, human: { status: "timeout", choice: null, elapsedMs: 7000 }, ai: refused, winner: "none", fasterThanAi: false }).title).toBe("无人获胜");
});

test("countdown never shows negative values", () => {
  expect(countdown(4823)).toBe("04.82");
  expect(countdown(-20)).toBe("00.00");
});
