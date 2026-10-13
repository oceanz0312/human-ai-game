"use client";

import { useMemo, useState } from "react";
import type { AiActivitySnapshot } from "@/game/ai-activity";
import type { RoundReveal } from "@/game/contracts";
import { danmakuFromActivitySteps, danmakuInsightFacts } from "@/game/danmaku-messages";
import { describeReveal } from "@/game/reveal-copy";
import { pad2 } from "@/lib/format";
import { AiActivityPanel } from "./AiActivityPanel";
import { AiDanmakuLane } from "./AiDanmakuLane";
import { AiRevealInsights } from "./AiRevealInsights";
import { DetailsSheet } from "./DetailsSheet";
import { RevealHeatmapBoard } from "./RevealHeatmapBoard";
import { VsRaceBar } from "./VsRaceBar";

interface LevelRevealProps {
  round: RoundReveal;
  fasterThanAiCount: number;
  ended: boolean;
  onNext: () => void;
  browserAiActivity?: AiActivitySnapshot | null;
}

export function LevelReveal({ round, fasterThanAiCount, ended, onNext, browserAiActivity }: LevelRevealProps) {
  const copy = describeReveal(round);
  const nextLabel = ended ? "查看结果" : "下一关";
  const showHeatmap = round.correctChoice !== null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  const humanMs = round.human?.elapsedMs ?? null;
  const aiMs = round.ai.elapsedMs;

  const danmakuMessages = useMemo(() => {
    const fromActivity = browserAiActivity?.steps ? danmakuFromActivitySteps(browserAiActivity.steps, false) : [];
    const facts = danmakuInsightFacts(round);
    return [...fromActivity, ...facts].slice(-8);
  }, [browserAiActivity, round]);

  return (
    <main className="mobile-shell reveal one-screen" aria-live="polite">
      <div className="topline">
        <span className="eyebrow num">第 {pad2(round.level)} 关</span>
        <span className="eyebrow">答案揭晓</span>
      </div>

      <div className="reveal-top-actions">
        <button type="button" className="primary-action num" data-testid="reveal-next" onClick={onNext}>
          {nextLabel}
        </button>
      </div>

      <section className="reveal-stage">
        <div className="reveal-summary-compact">
          <div className="result-symbol result-symbol-compact" aria-hidden>
            {copy.symbol}
          </div>
          <div className="reveal-copy-compact">
            <h1 className="page-title page-title-compact">{copy.title}</h1>
            <p className="body-text body-text-compact">{copy.detail}</p>
          </div>
        </div>

        <VsRaceBar humanMs={humanMs} aiMs={aiMs} />

        {fasterThanAiCount > 0 ? <p className="faster-note faster-note-compact">本局已有 {fasterThanAiCount} 关比 AI 更快</p> : null}

        {showHeatmap ? (
          <div className="reveal-visual-compact">
            <div className="board-stage">
              <AiDanmakuLane messages={danmakuMessages} replay={!detailsOpen} paused={detailsOpen} />
              <RevealHeatmapBoard
                gridSize={round.gridSize}
                imageUrl={round.imageUrl}
                probabilities={round.ai.probabilities}
                aiChoice={round.ai.choice}
                correctChoice={round.correctChoice}
              />
            </div>
            <p className="heatmap-legend heatmap-legend-compact">
              <span className="legend-ai">实线</span>=AI · <span className="legend-correct">虚线</span>=答案
            </p>
          </div>
        ) : (
          <AiDanmakuLane messages={danmakuMessages} replay={!detailsOpen} paused={detailsOpen} />
        )}

        <button type="button" className="text-action details-link" onClick={() => setDetailsOpen(true)}>
          AI 详情
        </button>
      </section>

      <DetailsSheet open={detailsOpen} title="AI 详情" onClose={() => setDetailsOpen(false)}>
        {showHeatmap ? <AiRevealInsights round={round} /> : null}
        {browserAiActivity ? <AiActivityPanel progress={null} snapshot={browserAiActivity} /> : null}
      </DetailsSheet>
    </main>
  );
}
