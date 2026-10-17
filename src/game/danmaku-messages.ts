import type { AiActivityStep } from "@/game/ai-activity";
import { formatActivityClock } from "@/game/ai-activity";
import { describeTopCandidatesFriendly } from "@/game/ai-insights";
import type { RoundReveal } from "@/game/contracts";
import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";


export interface DanmakuMessage {
  id: string;
  text: string;
}

/** Danmaku mirrors the humanized timeline: one quiet line per real AI event, with its clock time. */
export function danmakuFromActivitySteps(steps: AiActivityStep[], _playMode = true, _locale: Locale = FALLBACK_MESSAGE_LOCALE): DanmakuMessage[] {
  void _playMode;
  void _locale;
  return steps.map((step) => {
    const time = step.timestamp != null ? ` · ${formatActivityClock(step.timestamp)}` : "";
    const detail = step.detail ? ` · ${step.detail}` : "";
    return { id: step.id + (step.timestamp ?? ""), text: `${step.label}${detail}${time}` };
  });
}

export function danmakuInsightFacts(round: RoundReveal, locale: Locale = FALLBACK_MESSAGE_LOCALE): DanmakuMessage[] {
  const t = translator(locale);
  const { ai } = round;
  const items: DanmakuMessage[] = [];
  const topLine = describeTopCandidatesFriendly(ai.probabilities, 3, locale);
  if (topLine) items.push({ id: "top", text: t("AI 最看好：{top}", { top: topLine }) });
  if (ai.confidence != null) items.push({ id: "conf", text: t("置信度 {p}%", { p: Math.round(ai.confidence * 100) }) });
  if (ai.modelElapsedMs != null) {
    const total = ai.elapsedMs != null ? (ai.elapsedMs / 1000).toFixed(2) : "—";
    items.push({ id: "model", text: t("模型 {m}s · AI 用时 {total}s", { m: (ai.modelElapsedMs / 1000).toFixed(2), total }) });
  } else if (ai.elapsedMs != null) {
    items.push({ id: "elapsed", text: t("AI 用时 {s}s", { s: (ai.elapsedMs / 1000).toFixed(2) }) });
  }
  return items;
}
