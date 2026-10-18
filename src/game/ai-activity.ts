import type { AiEvent, RoundReveal } from "@/game/contracts";
import { aiErrorLine, aiErrorTag } from "@/game/ai-error-copy";
import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { seconds } from "@/lib/format";


export type AiActivityStepState = "pending" | "active" | "done" | "error";

export type AiActivityStep = {
  id: string;
  label: string;
  timestamp: number | null;
  detail: string | null;
  state: AiActivityStepState;
};

export type AiActivitySnapshot = {
  steps: AiActivityStep[];
  capturedAt: number;
};

export function formatActivityClock(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Humanized AI timeline. "got the picture" / "analyzing" may come first from local presence cues (src/config/ai-presence.ts,
 * answer-independent); "answered"/"error" only ever come from the server. During play it never
 * shows the AI's cell or its time (the answer and time stay sealed until the player locks in).
 */
export function buildAiEventSteps(
  events: AiEvent[],
  opts: { locale?: Locale; reveal?: RoundReveal | null; waitingMs?: number | null; scanCaption?: string | null } = {},
): AiActivityStep[] {
  const t = translator(opts.locale ?? FALLBACK_MESSAGE_LOCALE);
  const steps: AiActivityStep[] = [];
  const final = events.find((event) => event.event === "answered" || event.event === "error");
  const image = events.find((event) => event.event === "image");
  const sent = events.find((event) => event.event === "sent");
  if (image) steps.push({ id: "image", label: t("AI 看到了图片"), timestamp: image.at, detail: null, state: "done" });
  if (sent) {
    steps.push({
      id: "analyze",
      // While the AI works, the line shows the rotating presence caption (cosmetic, answer-independent).
      label: final ? t("AI 开始分析") : (opts.scanCaption ?? t("AI 正在分析…")),
      timestamp: sent.at,
      detail: !final && opts.waitingMs != null ? t("已用 {s}", { s: seconds(opts.waitingMs) }) : null,
      state: final ? "done" : "active",
    });
  }
  if (final?.event === "answered") {
    const ai = opts.reveal?.ai;
    if (ai && ai.status === "complete") {
      const verdict = ai.correct ? t("答对") : t("看错了");
      steps.push({
        id: "answer",
        label: t("AI 给出答案"),
        timestamp: final.at,
        detail: ai.elapsedMs != null ? `${seconds(ai.elapsedMs)} · ${verdict}` : verdict,
        state: ai.correct ? "done" : "error",
      });
    } else {
      steps.push({ id: "answer", label: t("AI 已作答 · 答案已封存"), timestamp: final.at, detail: null, state: "done" });
    }
  } else if (final?.event === "error") {
    steps.push({ id: "error", label: aiErrorLine(final.code ?? null, opts.locale), timestamp: final.at, detail: null, state: "error" });
  }
  return steps;
}

/** Short AI state for the VS card. */
export function aiStatusLabel(events: AiEvent[], opts: { locale?: Locale; locked?: boolean; waitingMs?: number | null; scanCaption?: string | null } = {}) {
  const t = translator(opts.locale ?? FALLBACK_MESSAGE_LOCALE);
  const final = events.find((event) => event.event === "answered" || event.event === "error");
  if (final?.event === "answered") return t("AI 已作答 🔒");
  if (final?.event === "error") return aiErrorTagFromCode(final.code ?? null, opts.locale);
  if (events.some((event) => event.event === "sent")) {
    return opts.locked && opts.waitingMs != null ? t("AI 还在分析 {s}", { s: seconds(opts.waitingMs) }) : (opts.scanCaption ?? t("AI 正在分析"));
  }
  if (events.some((event) => event.event === "image")) return t("AI 看到了图片");
  return t("准备中");
}

function aiErrorTagFromCode(code: string | null, locale?: Locale) {
  return aiErrorTag(code, code === "refused", locale);
}
