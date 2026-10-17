"use client";

import type { ReactNode } from "react";
import { formatActivityClock, type AiActivityStep } from "@/game/ai-activity";
import { useT } from "@/i18n/client";

const MARK: Record<AiActivityStep["state"], string> = { done: "[ok]", active: "[..]", pending: "[  ]", error: "[!!]" };

/**
 * ASCII terminal view of the real AI request timeline (asciicn-flavoured). During play it only ever shows
 * network steps and timings — never the AI's chosen cell or probabilities.
 */
export function AiTerminal({
  title,
  steps,
  live = false,
  children,
  footer,
  testId = "ai-terminal",
}: {
  title: string;
  steps: AiActivityStep[];
  live?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  const t = useT();
  return (
    <section className="ai-terminal" data-testid={testId} aria-label={title}>
      <div className="ai-terminal-head">
        <span className="term-title">
          <span className="term-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {title}
        </span>
        <span className={live ? "term-live" : "term-dim"}>{live ? `● ${t("实时")}` : t("回放")}</span>
      </div>
      <div className="ai-terminal-body" aria-live={live ? "polite" : undefined}>
        {steps.map((step) => (
          <p key={step.id} className={`term-line is-${step.state}`} data-step={step.id}>
            <span className="term-time">{step.timestamp != null ? formatActivityClock(step.timestamp) : "--:--:--"}</span>{" "}
            <span className="term-mark">{MARK[step.state]}</span> {step.label}
            {step.detail ? <span className="term-detail"> · {step.detail}</span> : null}
          </p>
        ))}
        {children}
        {live ? (
          <p className="term-line term-prompt">
            <span className="term-ai">luna@decisions</span>:~$ <span className="term-cursor" aria-hidden />
          </p>
        ) : null}
      </div>
      {footer ? <div className="ai-terminal-foot">{footer}</div> : null}
    </section>
  );
}
