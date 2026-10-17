import { aiErrorRevealHint, aiErrorRevealTitle, aiErrorStatusTag } from "./ai-error-copy";
import type { RoundReveal } from "./contracts";
import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";


export interface RevealCopy {
  symbol: "✓" | "×" | "—";
  title: string;
  detail: string;
  humanValue: { tag: string | null; time: string | null };
  aiValue: { tag: string | null; time: string | null };
}

const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export function describeReveal(round: RoundReveal, locale: Locale = FALLBACK_MESSAGE_LOCALE): RevealCopy {
  const t = translator(locale);
  const human = round.human;
  const humanCorrect = human?.status === "correct";
  const humanMissed = human?.status === "timeout" ? t("你超时了") : t("你答错了");
  const lifeNote = humanCorrect ? "" : t(" · 用掉 1 次机会");

  const humanValue = {
    tag: human?.status === "correct" ? null : human?.status === "timeout" ? t("超时") : t("答错"),
    time: human && human.status !== "timeout" ? secs(human.elapsedMs) : null,
  };
  const aiValue =
    round.ai.status === "complete"
      ? { tag: round.ai.correct ? null : t("答错"), time: round.ai.elapsedMs !== null ? secs(round.ai.elapsedMs) : null }
      : round.ai.status === "error"
        ? { tag: aiErrorStatusTag(round.ai.errorCode, round.ai.refused, locale), time: null }
        : { tag: t("判断中"), time: null };

  if (round.ai.status === "error" && !round.ai.refused) {
    const code = round.ai.errorCode ?? "unknown";
    const hint = aiErrorRevealHint(code, locale);
    const extra = round.ai.errorDetail ? ` · ${round.ai.errorDetail}` : "";
    const baseDetail = humanCorrect ? t("你答对了 · 本关照常结算") : `${humanMissed}${lifeNote}`;
    const detail = hint ? `${baseDetail} · ${hint}${extra}` : `${baseDetail}${extra}`;
    return { symbol: "—", title: aiErrorRevealTitle(code, locale), detail, humanValue, aiValue };
  }
  if (round.winner === "pending") {
    return { symbol: humanCorrect ? "✓" : "×", title: t("AI 仍在判断"), detail: humanCorrect ? t("你答对了 · 稍后补齐 AI 结果") : `${humanMissed}${lifeNote}`, humanValue, aiValue };
  }
  if (round.winner === "human") {
    const aiElapsed = round.ai.elapsedMs;
    const detail =
      round.ai.correct && human && aiElapsed !== null
        ? t("双方正确 · 你快了 {s} 秒", { s: ((aiElapsed - human.elapsedMs) / 1000).toFixed(2) })
        : round.ai.refused
          ? t("AI 放弃作答")
          : t("AI 答错了");
    return { symbol: "✓", title: t("你赢了"), detail, humanValue, aiValue };
  }
  if (round.winner === "ai") {
    const aiElapsed = round.ai.elapsedMs;
    const detail =
      humanCorrect && human && aiElapsed !== null ? t("双方正确 · AI 快了 {s} 秒", { s: ((human.elapsedMs - aiElapsed) / 1000).toFixed(2) }) : `${humanMissed}${lifeNote}`;
    return { symbol: "×", title: t("AI 赢了"), detail, humanValue, aiValue };
  }
  return { symbol: "—", title: t("无人获胜"), detail: `${t("双方都没找到")}${lifeNote}`, humanValue, aiValue };
}

export function shareHeadline(result: { reachedLevel: number; fasterThanAiCount: number; cleared: boolean }, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  if (result.cleared) return t("我通关了 HUMAN VS AI");
  if (result.fasterThanAiCount > 0) return t("我有 {n} 关比 AI 更快", { n: result.fasterThanAiCount });
  return t("我到达了第 {n} 关", { n: result.reachedLevel });
}
