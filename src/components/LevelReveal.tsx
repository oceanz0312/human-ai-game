"use client";

import type { RoundReveal } from "@/game/contracts";
import { describeReveal } from "@/game/reveal-copy";
import { pad2 } from "@/lib/format";
import { AiRevealInsights } from "./AiRevealInsights";
import { RevealHeatmapBoard } from "./RevealHeatmapBoard";

interface LevelRevealProps {
  round: RoundReveal;
  fasterThanAiCount: number;
  ended: boolean;
  secondsLeft: number | null;
  onNext: () => void;
}

export function LevelReveal({ round, fasterThanAiCount, ended, secondsLeft, onNext }: LevelRevealProps) {
  const copy = describeReveal(round);
  const nextLabel = ended ? "查看结果" : "下一关";
  const showHeatmap = round.correctChoice !== null;

  return (
    <main className="mobile-shell reveal" aria-live="polite">
      <div className="topline">
        <span className="eyebrow num">第 {pad2(round.level)} 关</span>
        <span className="eyebrow">答案揭晓</span>
      </div>

      <section className="reveal-body reveal-body-expanded">
        <div className="reveal-summary">
          <div className="result-symbol" aria-hidden>
            {copy.symbol}
          </div>
          <div className="reveal-copy">
            <h1 className="page-title">{copy.title}</h1>
            <p className="body-text">{copy.detail}</p>

            <div className="compare">
              <div className="row">
                <span className="label">你</span>
                <span className="value">
                  {copy.humanValue.tag ? <small>{copy.humanValue.tag}</small> : null}
                  {copy.humanValue.time ?? "—"}
                </span>
              </div>
              <div className="row">
                <span className="label">AI</span>
                <span className="value">
                  {copy.aiValue.tag ? <small>{copy.aiValue.tag}</small> : null}
                  {copy.aiValue.time ?? "—"}
                </span>
              </div>
            </div>

            {fasterThanAiCount > 0 ? <p className="faster-note">本局已有 {fasterThanAiCount} 关比 AI 更快</p> : null}
          </div>
        </div>

        {showHeatmap ? (
          <div className="reveal-visual">
            <RevealHeatmapBoard
              gridSize={round.gridSize}
              imageUrl={round.imageUrl}
              probabilities={round.ai.probabilities}
              aiChoice={round.ai.choice}
              correctChoice={round.correctChoice}
            />
            <p className="heatmap-legend">
              深色表示 AI 认为更可能的格子；<span className="legend-ai">实线框</span> 为 AI 选择，<span className="legend-correct">虚线框</span> 为正确答案。
            </p>
            <AiRevealInsights round={round} />
          </div>
        ) : null}
      </section>

      <div className="bottom-actions">
        <button type="button" className="primary-action num" onClick={onNext}>
          {secondsLeft !== null && secondsLeft > 0 ? `${nextLabel} · ${secondsLeft}` : nextLabel}
        </button>
      </div>
    </main>
  );
}
