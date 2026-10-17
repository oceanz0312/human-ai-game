"use client";

import { formatActivityClock, type AiActivitySnapshot } from "@/game/ai-activity";
import { useT } from "@/i18n/client";

interface AiActivityPanelProps {
  snapshot: AiActivitySnapshot | null;
  compact?: boolean;
  title?: string;
}

export function AiActivityPanel({ snapshot, compact = false, title }: AiActivityPanelProps) {
  const t = useT();
  const steps = snapshot?.steps ?? [];

  return (
    <section
      className={compact ? "ai-activity ai-activity-compact" : "ai-activity"}
      aria-live="polite"
      data-testid="ai-activity"
    >
      <div className="ai-activity-head">
        <span className="ai-dot" aria-hidden />
        <span className="ai-activity-title">{title ?? t("AI 活动")}</span>
      </div>
      <ol className="ai-activity-steps">
        {steps.map((step) => (
          <li key={step.id} className={`ai-activity-step is-${step.state}`} data-testid="ai-activity-step" data-step={step.id}>
            <span className="ai-activity-label">{step.label}</span>
            <span className="ai-activity-meta">
              {step.timestamp != null ? (
                <time className="ai-activity-time num" dateTime={new Date(step.timestamp).toISOString()}>
                  {formatActivityClock(step.timestamp)}
                </time>
              ) : (
                <span className="ai-activity-time pending">…</span>
              )}
            </span>
            {step.detail ? <span className="ai-activity-detail">{step.detail}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
