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

const PLAY_STEP_IDS = new Set(["prepare", "ticket", "send", "image", "wait", "response", "locked"]);

export function danmakuFromActivitySteps(steps: AiActivityStep[], playMode: boolean, locale: Locale = FALLBACK_MESSAGE_LOCALE): DanmakuMessage[] {
  const filtered = playMode ? steps.filter((step) => PLAY_STEP_IDS.has(step.id)) : steps;
  return filtered.map((step) => ({
    id: step.id + (step.timestamp ?? ""),
    text: formatStepDanmaku(step, playMode, locale),
  }));
}

function formatStepDanmaku(step: AiActivityStep, playMode: boolean, locale: Locale): string {
  const time =
    step.timestamp != null ? formatActivityClock(step.timestamp) : step.state === "active" ? "…" : "";
  const timeSuffix = time ? ` · ${time}` : "";
  let label = step.label;
  if (playMode && step.id === "response" && step.detail) {
    const safeDetail = step.detail.replace(/r\d+c\d/gi, "").replace(/概率|probability|%/gi, "");
    label = `${step.label}${safeDetail ? ` · ${safeDetail}` : ""}`;
  } else if (!playMode && step.detail) {
    label = `${step.label} · ${step.detail}`;
  } else {
    label = step.label;
  }
  if (playMode && step.id === "wait") label = `${step.label} · ${translator(locale)("非模拟思考")}`;
  return `${label}${timeSuffix}`;
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
    items.push({ id: "model", text: t("模型 {m}s · 全程 {total}s", { m: (ai.modelElapsedMs / 1000).toFixed(2), total }) });
  } else if (ai.elapsedMs != null) {
    items.push({ id: "elapsed", text: t("AI 耗时 {s}s", { s: (ai.elapsedMs / 1000).toFixed(2) }) });
  }
  return items;
}
