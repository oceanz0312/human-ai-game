import type { AiActivityStep } from "@/game/ai-activity";
import { formatActivityClock } from "@/game/ai-activity";
import { describeTopCandidatesFriendly } from "@/game/ai-insights";
import type { RoundReveal } from "@/game/contracts";

export interface DanmakuMessage {
  id: string;
  text: string;
}

const PLAY_STEP_IDS = new Set(["prepare", "ticket", "send", "image", "wait", "response", "locked"]);

export function danmakuFromActivitySteps(steps: AiActivityStep[], playMode: boolean): DanmakuMessage[] {
  const filtered = playMode ? steps.filter((step) => PLAY_STEP_IDS.has(step.id)) : steps;
  return filtered.map((step) => ({
    id: step.id + (step.timestamp ?? ""),
    text: formatStepDanmaku(step, playMode),
  }));
}

function formatStepDanmaku(step: AiActivityStep, playMode: boolean): string {
  const time =
    step.timestamp != null ? formatActivityClock(step.timestamp) : step.state === "active" ? "…" : "";
  const timeSuffix = time ? ` · ${time}` : "";
  let label = step.label;
  if (playMode && step.id === "response" && step.detail) {
    const safeDetail = step.detail.replace(/r\d+c\d/gi, "").replace(/概率|%/g, "");
    label = `${step.label}${safeDetail ? ` · ${safeDetail}` : ""}`;
  } else if (!playMode && step.detail) {
    label = `${step.label} · ${step.detail}`;
  } else {
    label = step.label;
  }
  if (playMode && step.id === "wait") label = `${step.label} · 非模拟思考`;
  return `${label}${timeSuffix}`;
}

export function danmakuInsightFacts(round: RoundReveal): DanmakuMessage[] {
  const { ai } = round;
  const items: DanmakuMessage[] = [];
  const topLine = describeTopCandidatesFriendly(ai.probabilities, 3);
  if (topLine) items.push({ id: "top", text: `AI 最看好：${topLine}` });
  if (ai.confidence != null) items.push({ id: "conf", text: `置信度 ${Math.round(ai.confidence * 100)}%` });
  if (ai.modelElapsedMs != null) {
    const total = ai.elapsedMs != null ? (ai.elapsedMs / 1000).toFixed(2) : "—";
    items.push({ id: "model", text: `模型 ${(ai.modelElapsedMs / 1000).toFixed(2)}s · 全程 ${total}s` });
  } else if (ai.elapsedMs != null) {
    items.push({ id: "elapsed", text: `AI 耗时 ${(ai.elapsedMs / 1000).toFixed(2)}s` });
  }
  return items;
}
