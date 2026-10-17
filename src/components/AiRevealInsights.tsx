"use client";

import { aiErrorRevealHint, aiErrorRevealTitle } from "@/game/ai-error-copy";
import {
  buildTimingTimeline,
  formatPercent,
  hesitationFromProbabilities,
  rankCandidates,
} from "@/game/ai-insights";
import type { RoundReveal } from "@/game/contracts";
import { useLocale, useT } from "@/i18n/client";
import type { T } from "@/i18n/messages";

function shortCell(id: string, t: T) {
  const match = /^r(\d+)c(\d+)$/.exec(id);
  return match ? t("{row} 行 {col} 列", { row: match[1], col: match[2] }) : id;
}

interface AiRevealInsightsProps {
  round: RoundReveal;
}

export function AiRevealInsights({ round }: AiRevealInsightsProps) {
  const t = useT();
  const locale = useLocale();
  const { ai } = round;
  const waiting = ai.status === "pending" || ai.status === "running";
  const refused = ai.refused;
  const hasProbabilities = Boolean(ai.probabilities && Object.keys(ai.probabilities).length);
  const ranked = rankCandidates(ai.probabilities, 3);
  const hesitation = hesitationFromProbabilities(ai.probabilities, locale);
  const timeline = buildTimingTimeline(ai.elapsedMs, ai.modelElapsedMs);
  const confidencePercent = ai.confidence != null ? Math.round(ai.confidence * 100) : null;

  if (waiting) {
    return (
      <section className="ai-insights" aria-live="polite">
        <h2 className="insights-title">{t("AI 决策过程")}</h2>
        <p className="insights-waiting">{t("等待 AI 返回最终答案（非模拟进度）")}</p>
      </section>
    );
  }

  if (refused) {
    return (
      <section className="ai-insights">
        <h2 className="insights-title">{t("AI 决策过程")}</h2>
        <p className="insights-refusal">{t("AI 放弃作答：模型未选出任何格子。")}</p>
      </section>
    );
  }

  if (ai.status === "error") {
    const code = round.ai.errorCode ?? "unknown";
    const detail = round.ai.errorDetail;
    const hint = aiErrorRevealHint(code, locale);
    return (
      <section className="ai-insights">
        <h2 className="insights-title">{t("AI 决策过程")}</h2>
        <p className="insights-muted">
          {aiErrorRevealTitle(code, locale)}
          {hint ? <> — {hint}</> : null}
          {detail ? <> — {detail}</> : null}
          {t("，未能记录本次概率分布。")}
        </p>
      </section>
    );
  }

  return (
    <section className="ai-insights" data-testid="ai-insights">
      <h2 className="insights-title">{t("AI 决策过程")}</h2>

      {hasProbabilities && ranked.length ? (
        <div className="insights-top">
          <p className="insights-label">{t("AI 最看好")}</p>
          <ol className="candidate-chips" data-testid="candidate-chips">
            {ranked.map((item) => {
              const marks = [item.id === ai.choice ? "is-ai" : "", item.id === round.correctChoice ? "is-correct" : ""].filter(Boolean).join(" ");
              return (
                <li key={item.id} className={`candidate-chip ${marks}`.trim()} data-testid="candidate-chip">
                  <span className="candidate-cell">{shortCell(item.id, t)}</span>
                  <strong className="num">{formatPercent(item.probability)}</strong>
                  {item.id === round.correctChoice ? <span className="candidate-tag">{t("答案")}</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="insights-muted">{t("本关未保存概率分布（可能是较早的对局记录）。")}</p>
      )}

      {confidencePercent != null ? (
        <div className="confidence-block">
          <div className="confidence-head">
            <span>{t("置信度")}</span>
            <span className="num">{confidencePercent}%</span>
          </div>
          <div className="confidence-track" aria-hidden>
            <div className="confidence-fill" style={{ width: `${confidencePercent}%` }} />
          </div>
        </div>
      ) : null}

      {hasProbabilities ? (
        <p className="insights-hesitation">
          {t("犹豫程度：")}<strong>{hesitation.label}</strong>
          <span className="insights-muted"> · {hesitation.detail}</span>
        </p>
      ) : null}

      {timeline.hasData ? (
        <div className="timing-block">
          <div className="timing-head">
            <span>{t("AI 用时")}</span>
            <span className="num">{((timeline.totalMs ?? 0) / 1000).toFixed(2)}s</span>
          </div>
          <div className="timing-bar" role="img" aria-label={t("模型 {m} 秒，其余 {o} 秒", { m: ((timeline.modelMs ?? 0) / 1000).toFixed(2), o: ((timeline.overheadMs ?? 0) / 1000).toFixed(2) })}>
            <div
              className="timing-segment model"
              style={{ flex: timeline.modelMs ?? 0 }}
              title={`${t("模型推理")} ${((timeline.modelMs ?? 0) / 1000).toFixed(2)}s`}
            />
            <div
              className="timing-segment overhead"
              style={{ flex: timeline.overheadMs ?? 0 }}
              title={`${t("转发与等待")} ${((timeline.overheadMs ?? 0) / 1000).toFixed(2)}s`}
            />
          </div>
          <div className="timing-legend">
            <span>
              {t("模型推理")} <span className="num">{((timeline.modelMs ?? 0) / 1000).toFixed(2)}s</span>
            </span>
            <span>
              {t("转发与等待")} <span className="num">{((timeline.overheadMs ?? 0) / 1000).toFixed(2)}s</span>
            </span>
          </div>
          <p className="insights-speed">{t("Decisions API 一次返回最终答案，System 1 级速度。")}</p>
        </div>
      ) : ai.elapsedMs != null ? (
        <p className="insights-muted">
          {t("AI 用时")} <span className="num">{(ai.elapsedMs / 1000).toFixed(2)}s</span>
          {ai.modelElapsedMs == null ? t("（未记录模型分段）") : null}
        </p>
      ) : null}

    </section>
  );
}
