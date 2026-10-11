import type { AiNetworkProgress } from "@/lib/ai-dispatch";

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
export function buildAiActivitySteps(progress: AiNetworkProgress | null, submitting = false): AiActivityStep[] {
  if (submitting && progress?.ticketIssuedAt) {
    const prior = buildAiActivitySteps(progress, false);
    return [
      ...prior.map((step) => (step.state === "active" ? { ...step, state: "done" as const } : step)),
      {
        id: "locked",
        label: "答案已锁定",
        timestamp: Date.now(),
        detail: "正在结算",
        state: "done",
      },
    ];
  }

  if (submitting) {
    return [
      {
        id: "locked",
        label: "答案已锁定",
        timestamp: Date.now(),
        detail: "正在结算",
        state: "active",
      },
    ];
  }

  if (!progress?.ticketIssuedAt) {
    return [
      {
        id: "prepare",
        label: "准备 AI 请求",
        timestamp: null,
        detail: "点击不同项",
        state: "active",
      },
    ];
  }

  const steps: AiActivityStep[] = [
    {
      id: "ticket",
      label: "决策凭证已签发",
      timestamp: progress.ticketIssuedAt,
      detail: null,
      state: "done",
    },
  ];

  if (!progress.requestSentAt) {
    steps.push({
      id: "send",
      label: "发送至 Worker",
      timestamp: null,
      detail: "验图并转发 OpenAI",
      state: "active",
    });
    return steps;
  }

  steps.push({
    id: "send",
    label: "请求已发送至 Worker",
    timestamp: progress.requestSentAt,
    detail: "验图并转发 OpenAI",
    state: "done",
  });

  if (progress.imageLoadMs != null && progress.requestSentAt != null) {
    steps.push({
      id: "image",
      label: "关卡图像已确认",
      timestamp: progress.requestSentAt + progress.imageLoadMs,
      detail: progress.imageLoadMs > 0 ? `验图 ${progress.imageLoadMs}ms` : null,
      state: "done",
    });
  }

  if (!progress.responseReceivedAt) {
    steps.push({
      id: "wait",
      label: "等待 Worker 响应",
      timestamp: null,
      detail: "等待中（非模拟思考）",
      state: "active",
    });
    return steps;
  }

  const totalMs =
    progress.totalElapsedMs ??
    (progress.requestSentAt != null ? Math.max(0, progress.responseReceivedAt - progress.requestSentAt) : null);
  const modelMs = progress.modelElapsedMs;
  const timingParts: string[] = [];
  if (modelMs != null) timingParts.push(`模型 ${modelMs}ms`);
  if (totalMs != null) timingParts.push(`全程 ${totalMs}ms`);

  steps.push({
    id: "response",
    label: progress.errorCode ? "Worker 已响应（异常）" : "Worker 已响应",
    timestamp: progress.responseReceivedAt,
    detail: timingParts.length ? timingParts.join(" · ") : progress.errorCode ?? null,
    state: progress.errorCode ? "error" : "done",
  });

  return steps;
}

export function snapshotAiActivity(progress: AiNetworkProgress | null, submitting = false): AiActivitySnapshot {
  return { steps: buildAiActivitySteps(progress, submitting), capturedAt: Date.now() };
}
