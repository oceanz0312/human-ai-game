"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RevealRound, RevealShellGame } from "@/core/client-game";
import { KoMark, ResultBanner, StreakCounter, type BannerOutcome } from "@/core/fx/Banners";
import { shake, sparkBurst } from "@/core/fx/dom";
import { hapticFx, playSfx } from "@/core/fx/sfx";
import { renderLevelCard, shareLevelCard } from "@/core/share/level-card";
import { SITE_URL } from "@/config/site";
import type { AiActivitySnapshot } from "@/game/ai-activity";
import type { RoundReveal } from "@/game/contracts";
import { danmakuFromActivitySteps } from "@/game/danmaku-messages";
import { describeReveal } from "@/game/reveal-copy";
import { pad2, seconds } from "@/lib/format";
import { AiActivityPanel } from "./AiActivityPanel";
import { AiDanmakuLane } from "./AiDanmakuLane";
import { AiRevealInsights } from "./AiRevealInsights";
import { DetailsSheet } from "./DetailsSheet";
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
  /** Game plugin: renders the reveal board (core shell stays game-agnostic). */
  game: RevealShellGame;
  streak?: { combo: number; streak: number };
}

/** Reveal uses the exact GameStage slots of play: same board size and position, 下一关 directly below the board. */
export function LevelReveal({ round, fasterThanAiCount, ended, onNext, browserAiActivity, topBar, game, streak }: LevelRevealProps) {
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

  // Feel kit: hit/miss burst on the player's cell, board shake, sounds, banner, K.O.
  const boardRef = useRef<HTMLDivElement | null>(null);
  const humanCorrect = round.human?.status === "correct";
  const aiFinal = round.ai.status === "complete" || round.ai.status === "error";
  const aiKo = round.ai.status === "complete" && round.ai.correct === false;
  const outcome: BannerOutcome = !aiFinal ? "none" : round.winner === "human" ? "win" : round.winner === "ai" ? "lose" : round.winner === "none" ? "draw" : "none";
  const fxDoneFor = useRef<string | null>(null);
  useEffect(() => {
    if (fxDoneFor.current === round.id) return;
    fxDoneFor.current = round.id;
    const host = boardRef.current;
    const choice = round.human?.choice;
    const cell = choice ? host?.querySelector(`[data-answer="${CSS.escape(choice)}"]`) : null;
    sparkBurst(cell ?? null, humanCorrect ? "hit" : "miss");
    shake(host?.firstElementChild ?? null, { freezeMs: humanCorrect ? 60 : 0 });
    hapticFx(humanCorrect ? "hit" : "miss");
    playSfx(humanCorrect ? "hit" : "miss");
  }, [round.id, round.human?.choice, humanCorrect]);
  const bannerFor = useRef<string | null>(null);
  useEffect(() => {
    if (outcome === "none" || bannerFor.current === round.id) return;
    bannerFor.current = round.id;
    const timer = window.setTimeout(() => {
      playSfx(outcome === "win" ? "win" : outcome === "lose" ? "lose" : "beep");
      if (aiKo) window.setTimeout(() => playSfx("ko"), 380);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [outcome, aiKo, round.id]);

  const [cardState, setCardState] = useState<"idle" | "busy" | "done">("idle");
  const cardImage = game.cardImage(round as unknown as RevealRound);
  const brag = round.winner === "human" && cardImage !== null;
  async function shareHighlight() {
    if (!cardImage || cardState === "busy") return;
    setCardState("busy");
    try {
      const headline = t("我在第 {n} 关赢了 AI", { n: round.level });
      const you = humanMs != null ? seconds(humanMs) : "—";
      const ai = round.ai.status === "complete" ? `${aiMs != null ? seconds(aiMs) : "—"}${round.ai.correct ? "" : ` · ${t("看错了")}`}` : (copy.aiValue.tag ?? t("AI 未作答"));
      const url = SITE_URL;
      const blob = await renderLevelCard({ imageUrl: cardImage, headline, lines: [`${t("你")} ${you}  vs  AI ${ai}`], url: url.replace(/^https?:\/\//, ""), brand: "HUMAN VS AI" });
      await shareLevelCard(blob, `human-vs-ai-level-${round.level}.png`, headline, url);
      setCardState("done");
    } catch {
      setCardState("idle");
    }
  }

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
        <div className="fx-board-host" ref={boardRef}>
          <game.RevealBoard round={round as unknown as RevealRound} />
          <ResultBanner key={`${round.id}-${outcome}`} outcome={outcome} />
        </div>
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
            {aiKo ? <KoMark /> : null}
            {streak ? <StreakCounter combo={streak.combo} streak={streak.streak} /> : null}
            {brag ? (
              <Button variant="secondary" className="brag-card" data-testid="brag-card" onClick={shareHighlight} disabled={cardState === "busy"}>
                {cardState === "done" ? t("卡片已生成") : t("📸 本关值得炫耀")}
              </Button>
            ) : null}
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
