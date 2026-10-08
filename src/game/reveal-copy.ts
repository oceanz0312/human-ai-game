import type { RoundReveal } from "./contracts";

export interface RevealCopy {
  symbol: "✓" | "×" | "—";
  title: string;
  detail: string;
  humanValue: { tag: string | null; time: string | null };
  aiValue: { tag: string | null; time: string | null };
}

const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export function describeReveal(round: RoundReveal): RevealCopy {
  const human = round.human;
  const humanCorrect = human?.status === "correct";
  const humanMissed = human?.status === "timeout" ? "你超时了" : "你答错了";
  const lifeNote = humanCorrect ? "" : " · 失去 1 条命";

  const humanValue = {
    tag: human?.status === "correct" ? null : human?.status === "timeout" ? "超时" : "答错",
    time: human && human.status !== "timeout" ? secs(human.elapsedMs) : null,
  };
  const aiValue =
    round.ai.status === "complete"
      ? { tag: round.ai.correct ? null : "答错", time: round.ai.elapsedMs !== null ? secs(round.ai.elapsedMs) : null }
      : round.ai.status === "error"
        ? { tag: "掉线", time: null }
        : { tag: "判断中", time: null };

  if (round.ai.status === "error") {
    return { symbol: "—", title: "AI 掉线", detail: humanCorrect ? "你答对了 · 本关照常结算" : `${humanMissed}${lifeNote}`, humanValue, aiValue };
  }
  if (round.winner === "pending") {
    return { symbol: humanCorrect ? "✓" : "×", title: "AI 仍在判断", detail: humanCorrect ? "你答对了 · 稍后补齐 AI 结果" : `${humanMissed}${lifeNote}`, humanValue, aiValue };
  }
  if (round.winner === "human") {
    const aiElapsed = round.ai.elapsedMs;
    const detail =
      round.ai.correct && human && aiElapsed !== null ? `双方正确 · 你快了 ${((aiElapsed - human.elapsedMs) / 1000).toFixed(2)} 秒` : "AI 答错了";
    return { symbol: "✓", title: "你赢了", detail, humanValue, aiValue };
  }
  if (round.winner === "ai") {
    const aiElapsed = round.ai.elapsedMs;
    const detail =
      humanCorrect && human && aiElapsed !== null ? `双方正确 · AI 快了 ${((human.elapsedMs - aiElapsed) / 1000).toFixed(2)} 秒` : `${humanMissed}${lifeNote}`;
    return { symbol: "×", title: "AI 赢了", detail, humanValue, aiValue };
  }
  return { symbol: "—", title: "无人获胜", detail: `双方都没找到${lifeNote}`, humanValue, aiValue };
}

export function shareHeadline(result: { reachedLevel: number; fasterThanAiCount: number; cleared: boolean }) {
  if (result.cleared) return "我通关了 HUMAN / AI";
  if (result.fasterThanAiCount > 0) return `我有 ${result.fasterThanAiCount} 关比 AI 更快`;
  return `我到达了第 ${result.reachedLevel} 关`;
}
