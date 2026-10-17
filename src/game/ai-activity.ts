import type { AiEvent, RoundReveal } from "@/game/contracts";
import type { AiNetworkProgress } from "@/lib/ai-dispatch";
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

/** Compact step list from real browser-side dispatch timestamps (never includes the AI's chosen cell). */
export function buildAiActivitySteps(progress: AiNetworkProgress | null, submitting = false, locale: Locale = FALLBACK_MESSAGE_LOCALE): AiActivityStep[] {
  const t = translator(locale);
  // Locking the human answer never changes the AI's own steps: an in-flight step stays in flight.
  if (submitting && progress?.ticketIssuedAt) return buildAiActivitySteps(progress, false, locale);

  if (submitting) {
    return [
      {
        id: "locked",
        label: t("答案已锁定"),
        timestamp: Date.now(),
        detail: t("正在结算"),
        state: "active",
      },
    ];
  }

  if (!progress?.ticketIssuedAt) {
    return [
      {
        id: "prepare",
        label: t("准备 AI 请求"),
        timestamp: null,
        detail: t("点击不同项"),
        state: "active",
      },
    ];
  }

  const steps: AiActivityStep[] = [
    {
      id: "ticket",
      label: t("决策凭证已签发"),
      timestamp: progress.ticketIssuedAt,
      detail: null,
      state: "done",
    },
  ];

  if (!progress.requestSentAt) {
    steps.push({
      id: "send",
      label: t("发送至 Worker"),
      timestamp: null,
      detail: t("验图并转发 OpenAI"),
      state: "active",
    });
    return steps;
  }

  steps.push({
    id: "send",
    label: t("请求已发送至 Worker"),
    timestamp: progress.requestSentAt,
    detail: t("验图并转发 OpenAI"),
    state: "done",
  });

  if (progress.imageLoadMs != null && progress.requestSentAt != null) {
    steps.push({
      id: "image",
      label: t("关卡图像已确认"),
      timestamp: progress.requestSentAt + progress.imageLoadMs,
      detail: progress.imageLoadMs > 0 ? t("验图 {s}", { s: seconds(progress.imageLoadMs) }) : null,
      state: "done",
    });
  }

  if (!progress.responseReceivedAt) {
    steps.push({
      id: "wait",
      label: t("等待 Worker 响应"),
      timestamp: null,
      detail: t("等待中（非模拟思考）"),
      state: "active",
    });
    return steps;
  }

  const totalMs =
    progress.totalElapsedMs ??
    (progress.requestSentAt != null ? Math.max(0, progress.responseReceivedAt - progress.requestSentAt) : null);
  const modelMs = progress.modelElapsedMs;
  const timingParts: string[] = [];
  if (totalMs != null) timingParts.push(t("往返 {s}", { s: seconds(totalMs) }));
  if (modelMs != null) timingParts.push(t("模型 {s}", { s: seconds(modelMs) }));

  steps.push({
    id: "response",
    label: progress.errorCode ? t("Worker 已响应（异常）") : t("Worker 已响应"),
    timestamp: progress.responseReceivedAt,
    detail: timingParts.length ? timingParts.join(" · ") : progress.errorCode ?? null,
    state: progress.errorCode ? "error" : "done",
  });

  return steps;
}

export function snapshotAiActivity(progress: AiNetworkProgress | null, submitting = false, locale: Locale = FALLBACK_MESSAGE_LOCALE): AiActivitySnapshot {
  return { steps: buildAiActivitySteps(progress, submitting, locale), capturedAt: Date.now() };
}

/**
 * Humanized AI timeline from real server events. One line per real event; nothing is simulated. During play it never
 * shows the AI's cell or its time (the answer and time stay sealed until the player locks in).
 */
export function buildAiEventSteps(
  events: AiEvent[],
  opts: { locale?: Locale; reveal?: RoundReveal | null; waitingMs?: number | null } = {},
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
      label: final ? t("AI 开始分析") : t("AI 正在分析…"),
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
export function aiStatusLabel(events: AiEvent[], opts: { locale?: Locale; locked?: boolean; waitingMs?: number | null } = {}) {
  const t = translator(opts.locale ?? FALLBACK_MESSAGE_LOCALE);
  const final = events.find((event) => event.event === "answered" || event.event === "error");
  if (final?.event === "answered") return t("AI 已作答 🔒");
  if (final?.event === "error") return aiErrorTagFromCode(final.code ?? null, opts.locale);
  if (events.some((event) => event.event === "sent")) {
    return opts.locked && opts.waitingMs != null ? t("AI 还在分析 {s}", { s: seconds(opts.waitingMs) }) : t("AI 正在分析");
  }
  if (events.some((event) => event.event === "image")) return t("AI 在看图");
  return t("准备中");
}

function aiErrorTagFromCode(code: string | null, locale?: Locale) {
  return aiErrorTag(code, code === "refused", locale);
}
