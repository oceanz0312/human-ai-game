"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AiActivitySnapshot } from "@/game/ai-activity";
import type { RoundReveal } from "@/game/contracts";
import { danmakuFromActivitySteps } from "@/game/danmaku-messages";
import { describeReveal } from "@/game/reveal-copy";
import { pad2, seconds } from "@/lib/format";
import { AiActivityPanel } from "./AiActivityPanel";
import { AiDanmakuLane } from "./AiDanmakuLane";
import { AiRevealInsights } from "./AiRevealInsights";
import { DetailsSheet } from "./DetailsSheet";
import { RevealHeatmapBoard } from "./RevealHeatmapBoard";
import { VsRaceBar } from "./VsRaceBar";
import { AiTerminal } from "./game/AiTerminal";
import { GameStage } from "./game/GameStage";
import { useLocale, useT } from "@/i18n/client";
import { Button, Kbd } from "@/components/ui/8bit";

interface LevelRevealProps {
  round: RoundReveal;
  fasterThanAiCount: number;
  ended: boolean;
  onNext: () => void;
  browserAiActivity?: AiActivitySnapshot | null;
  topBar?: ReactNode;
}

/** Reveal uses the exact GameStage slots of play: same board size and position, 下一关 directly below the board. */
export function LevelReveal({ round, fasterThanAiCount, ended, onNext, browserAiActivity, topBar }: LevelRevealProps) {
  const t = useT();
  const locale = useLocale();
  const copy = describeReveal(round, locale);
  const nextLabel = ended ? t("查看结果") : t("下一关");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const humanMs = round.human && round.human.status !== "timeout" ? round.human.elapsedMs : null;
  const aiMs = round.ai.status === "complete" ? round.ai.elapsedMs : null;

  const danmakuMessages = useMemo(() => {
    const fromActivity = browserAiActivity?.steps ? danmakuFromActivitySteps(browserAiActivity.steps, false, locale) : [];
    return fromActivity.slice(-8);
  }, [browserAiActivity, locale]);

  // Enter = 下一关 (a player action; the reveal never advances on its own).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || detailsOpen || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.tagName === "A")) return;
      event.preventDefault();
      onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailsOpen, onNext]);

  const aiSummary =
    round.ai.status === "complete"
      ? `${t("AI 用时")} ${aiMs != null ? seconds(aiMs) : "—"} · ${round.ai.correct ? t("答对") : t("看错了")}`
      : round.ai.status === "error"
        ? copy.aiValue.tag ?? t("AI 未作答")
        : t("AI 还在分析");

  return (
    <GameStage
      phase="reveal"
      topBar={topBar}
      hud={
        <div className="verdict-card" data-symbol={copy.symbol}>
          <span className="result-symbol" aria-hidden>
            {copy.symbol}
          </span>
          <div className="verdict-copy">
            <p className="verdict-eyebrow">
              {t("第 {n} 关", { n: pad2(round.level) })} · {t("答案揭晓")}
            </p>
            <h1 className="verdict-title">{copy.title}</h1>
            <p className="verdict-detail" title={copy.detail}>
              {copy.detail}
            </p>
          </div>
        </div>
      }
      lane={<AiDanmakuLane messages={danmakuMessages} paused={detailsOpen} />}
      board={
        <RevealHeatmapBoard
          gridSize={round.gridSize}
          imageUrl={round.imageUrl}
          probabilities={round.ai.probabilities}
          aiChoice={round.ai.choice}
          correctChoice={round.correctChoice}
          humanChoice={round.human?.choice ?? null}
        />
      }
      foot={
        <Button variant="primary" className="reveal-next num" data-testid="reveal-next" aria-label={nextLabel} onClick={onNext}>
          {nextLabel}
          <Kbd className="desk-only">Enter</Kbd>
        </Button>
      }
      side={
        <>
          <div className="race-card">
            <VsRaceBar humanMs={humanMs} aiMs={aiMs} />
            {fasterThanAiCount > 0 ? <p className="faster-note">{t("本局已有 {n} 关比 AI 更快", { n: fasterThanAiCount })}</p> : null}
            <Button variant="secondary" className="details-link mobile-only" onClick={() => setDetailsOpen(true)}>
              {t("AI 详情")}
            </Button>
          </div>
          <div className="desk-only reveal-insights">
            <p className="reveal-legend">
              <span className="legend-ai">{t("实线")}</span>=AI · <span className="legend-correct">{t("虚线")}</span>={t("答案")}
            </p>
            {round.correctChoice !== null ? <AiRevealInsights round={round} /> : null}
          </div>
          <AiTerminal title={t("AI 决策时间线")} steps={browserAiActivity?.steps ?? []} testId="ai-timeline">
            <p className="term-line term-summary">
              <span className="term-mark">[=]</span> {aiSummary}
            </p>
          </AiTerminal>
        </>
      }
      extra={
        <DetailsSheet open={detailsOpen} title={t("AI 详情")} onClose={() => setDetailsOpen(false)}>
          {round.correctChoice !== null ? <AiRevealInsights round={round} /> : null}
          {browserAiActivity ? <AiActivityPanel snapshot={browserAiActivity} title={t("决策时间线")} /> : null}
        </DetailsSheet>
      }
    />
  );
}
