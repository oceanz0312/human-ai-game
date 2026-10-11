"use client";

import {
  buildTimingTimeline,
  describeTopCandidatesFriendly,
  hesitationFromProbabilities,
} from "@/game/ai-insights";
import type { RoundReveal } from "@/game/contracts";

interface AiRevealInsightsProps {
  round: RoundReveal;
}

export function AiRevealInsights({ round }: AiRevealInsightsProps) {
  const { ai } = round;
  const waiting = ai.status === "pending" || ai.status === "running";
  const refused = ai.refused;
  const hasProbabilities = Boolean(ai.probabilities && Object.keys(ai.probabilities).length);
  const topLine = describeTopCandidatesFriendly(ai.probabilities, 3);
  const hesitation = hesitationFromProbabilities(ai.probabilities);
  const timeline = buildTimingTimeline(ai.elapsedMs, ai.modelElapsedMs);
  const confidencePercent = ai.confidence != null ? Math.round(ai.confidence * 100) : null;

  if (waiting) {
    return (
      <section className="ai-insights" aria-live="polite">
        <h2 className="insights-title">AI 决策过程</h2>
        <p className="insights-waiting">等待 AI 返回最终答案（非模拟进度）</p>
      </section>
    );
  }

  if (refused) {
    return (
      <section className="ai-insights">
        <h2 className="insights-title">AI 决策过程</h2>
        <p className="insights-refusal">AI 放弃作答：模型未选出任何格子。</p>
      </section>
    );
  }

  if (ai.status === "error") {
    return (
      <section className="ai-insights">
        <h2 className="insights-title">AI 决策过程</h2>
        <p className="insights-muted">AI 掉线，未能记录本次概率分布。</p>
      </section>
    );
  }

  return (
    <section className="ai-insights">
      <h2 className="insights-title">AI 决策过程</h2>

      {hasProbabilities && topLine ? (
        <p className="insights-lead">
          AI 最看好：<span className="num">{topLine}</span>
        </p>
      ) : (
        <p className="insights-muted">本关未保存概率分布（可能是较早的对局记录）。</p>
      )}

      {confidencePercent != null ? (
        <div className="confidence-block">
          <div className="confidence-head">
            <span>置信度</span>
            <span className="num">{confidencePercent}%</span>
          </div>
          <div className="confidence-track" aria-hidden>
            <div className="confidence-fill" style={{ width: `${confidencePercent}%` }} />
          </div>
        </div>
      ) : null}

      {hasProbabilities ? (
        <p className="insights-hesitation">
          犹豫程度：<strong>{hesitation.label}</strong>
          <span className="insights-muted"> · {hesitation.detail}</span>
        </p>
      ) : null}

      {timeline.hasData ? (
        <div className="timing-block">
          <div className="timing-head">
            <span>真实耗时</span>
            <span className="num">{((timeline.totalMs ?? 0) / 1000).toFixed(2)}s</span>
          </div>
          <div className="timing-bar" role="img" aria-label={`模型 ${((timeline.modelMs ?? 0) / 1000).toFixed(2)} 秒，其余 ${((timeline.overheadMs ?? 0) / 1000).toFixed(2)} 秒`}>
            <div
              className="timing-segment model"
              style={{ flex: timeline.modelMs ?? 0 }}
              title={`模型推理 ${((timeline.modelMs ?? 0) / 1000).toFixed(2)}s`}
            />
            <div
              className="timing-segment overhead"
              style={{ flex: timeline.overheadMs ?? 0 }}
              title={`转发与等待 ${((timeline.overheadMs ?? 0) / 1000).toFixed(2)}s`}
            />
          </div>
          <div className="timing-legend">
            <span>
              模型 <span className="num">{((timeline.modelMs ?? 0) / 1000).toFixed(2)}s</span>
            </span>
            <span>
              其余 <span className="num">{((timeline.overheadMs ?? 0) / 1000).toFixed(2)}s</span>
            </span>
          </div>
          <p className="insights-speed">Decisions API 一次返回最终答案，System 1 级速度。</p>
        </div>
      ) : ai.elapsedMs != null ? (
        <p className="insights-muted">
          总耗时 <span className="num">{(ai.elapsedMs / 1000).toFixed(2)}s</span>
          {ai.modelElapsedMs == null ? "（未记录模型分段）" : null}
        </p>
      ) : null}

    </section>
  );
}
