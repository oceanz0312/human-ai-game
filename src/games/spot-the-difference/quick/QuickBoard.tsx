"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUICK_PRESENCE } from "@/config/ai-presence";
import { track } from "@/lib/api-client";
import { planQuickAnswer } from "./quick-ai";
import { makePuzzle, QUICK_MODES, type QuickModeKey } from "./puzzle";
import { SpriteDefs, SpriteUse } from "./PixelSprite";
import "./quick.css";

type Phase = "ready" | "playing" | "reveal" | "done";
interface RoundResult {
  you: "correct" | "wrong" | "timeout";
  youMs: number | null;
  aiCorrect: boolean;
  aiMs: number;
  aiPick: number;
  pick: number | null;
  winner: "you" | "ai" | "none";
}

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * Instant spot-the-difference board: plays entirely in the browser against the in-game simulated AI
 * (same engine as the ranked game), never touches the server or the daily run limit.
 */
export function QuickBoard({ mode: modeKey, seed, title, cta }: { mode: QuickModeKey; seed: string; title: string; cta?: React.ReactNode }) {
  const mode = QUICK_MODES[modeKey];
  const [series, setSeries] = useState(seed);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [now, setNow] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const startRef = useRef(0);

  const puzzle = useMemo(() => makePuzzle(`${series}|${round}`, { theme: mode.theme, grid: mode.grids[round], changes: mode.changes }), [series, round, mode]);
  const limitMs = mode.limitS * 1000;
  const cells = puzzle.grid * puzzle.grid;
  const ai = useMemo(
    () =>
      planQuickAnswer({
        mode: modeKey,
        round,
        limitMs,
        correctChoice: String(puzzle.oddIndex),
        choices: Array.from({ length: cells }, (_, i) => String(i)),
        seed: `${series}|${round}|ai`,
      }),
    [modeKey, round, limitMs, puzzle.oddIndex, series, cells],
  );
  const prefix = `q-${modeKey}-${round}`;
  const elapsed = phase === "playing" ? now - startedAt : 0;
  const aiLocked = phase === "playing" && elapsed >= ai.thinkMs;
  // Presence cues: cosmetic, a pure function of elapsed time (never of the AI's answer or answer time).
  const aiCaption = aiLocked
    ? "Luna AI locked in its answer — hurry!"
    : elapsed < QUICK_PRESENCE.gotPictureMs
      ? "\u00a0"
      : elapsed < QUICK_PRESENCE.scanStartMs
        ? "Luna AI got the picture"
        : QUICK_PRESENCE.captions[Math.floor((elapsed - QUICK_PRESENCE.scanStartMs) / QUICK_PRESENCE.captionEveryMs) % QUICK_PRESENCE.captions.length];
  const result = results[round];

  const finish = useCallback(
    (pick: number | null) => {
      const youMs = pick === null ? null : performance.now() - startRef.current;
      const you: RoundResult["you"] = pick === null ? "timeout" : pick === puzzle.oddIndex ? "correct" : "wrong";
      const aiPick = Number(ai.choice);
      let winner: RoundResult["winner"] = "none";
      if (you === "correct" && (!ai.correct || (youMs ?? Infinity) < ai.thinkMs)) winner = "you";
      else if (ai.correct && (you !== "correct" || ai.thinkMs <= (youMs ?? Infinity))) winner = "ai";
      setResults((prev) => {
        const next = [...prev];
        next[round] = { you, youMs, aiCorrect: ai.correct, aiMs: ai.thinkMs, aiPick, pick, winner };
        return next;
      });
      setPhase("reveal");
      // Anonymous pacing data to calibrate QUICK_AI (no ids beyond the usual player cookie).
      track("quick_round", {
        metadata: { mode: modeKey, round: round + 1, grid: puzzle.grid, you, youMs: youMs === null ? null : Math.round(youMs), aiCorrect: ai.correct, aiMs: ai.thinkMs, winner, curve: "quick-v2" },
      });
    },
    [ai, puzzle.oddIndex, puzzle.grid, round, modeKey],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t - startRef.current >= limitMs) finish(null);
    }, 50);
    return () => window.clearInterval(id);
  }, [phase, limitMs, finish]);

  const start = () => {
    const t = performance.now();
    startRef.current = t;
    setStartedAt(t);
    setNow(t);
    setPhase("playing");
  };
  const next = () => {
    if (round + 1 >= mode.grids.length) return setPhase("done");
    setRound(round + 1);
    start();
  };
  const again = () => {
    setSeries(`${seed}-${Math.random().toString(36).slice(2, 8)}`);
    setResults([]);
    setRound(0);
    setPhase("ready");
  };

  const youWins = results.filter((r) => r?.winner === "you").length;
  const aiWins = results.filter((r) => r?.winner === "ai").length;
  const remaining = Math.max(0, limitMs - elapsed);

  return (
    <section className="quick" data-testid="quick-board" data-phase={phase} aria-label={title}>
      <div className="quick-hud">
        <span className="quick-round">
          Puzzle {round + 1}/{mode.grids.length} · {puzzle.grid}×{puzzle.grid}
        </span>
        <span className="quick-score" data-testid="quick-score">
          YOU {youWins} – {aiWins} AI
        </span>
        <span className="quick-clock" aria-live="off">
          {phase === "playing" ? fmt(remaining) : fmt(limitMs)}
        </span>
      </div>
      <div className="quick-stage">
        <SpriteDefs prefix={prefix} sprites={[puzzle.base, puzzle.odd]} />
        <div className="quick-grid" style={{ gridTemplateColumns: `repeat(${puzzle.grid}, 1fr)` }} role="group" aria-label={`${puzzle.grid} by ${puzzle.grid} picture grid`}>
          {Array.from({ length: cells }, (_, i) => {
            const isOdd = i === puzzle.oddIndex;
            const state = phase === "reveal" || phase === "done" ? (isOdd ? "odd" : result?.pick === i ? "miss" : result?.aiPick === i ? "ai" : "") : "";
            return (
              <button
                key={i}
                type="button"
                className="quick-cell"
                data-state={state || undefined}
                data-ai={(phase === "reveal" || phase === "done") && result?.aiPick === i ? "true" : undefined}
                data-testid="quick-cell"
                aria-label={`Row ${Math.floor(i / puzzle.grid) + 1}, column ${(i % puzzle.grid) + 1}`}
                disabled={phase !== "playing"}
                onClick={() => finish(i)}
              >
                <SpriteUse href={`${prefix}-${isOdd ? puzzle.odd.id : puzzle.base.id}`} />
              </button>
            );
          })}
        </div>
        {phase === "ready" ? (
          <div className="quick-overlay">
            <button type="button" className="quick-play" data-testid="quick-start" onClick={start}>
              ▶ Play
            </button>
            <p>Find the one picture that is different before the AI does.</p>
          </div>
        ) : null}
        {phase === "done" ? (
          <div className="quick-overlay quick-done" data-testid="quick-done">
            <p className="quick-final">{youWins > aiWins ? "You beat the AI!" : youWins === aiWins ? "It's a draw." : "The AI wins this time."}</p>
            <p>
              YOU {youWins} – {aiWins} AI
            </p>
            {cta}
            <button type="button" className="quick-again" onClick={again}>
              New puzzles ↻
            </button>
          </div>
        ) : null}
      </div>
      <div className="quick-caption" data-testid="quick-caption" aria-live="polite">
        {phase === "ready" ? "Tap Play, then tap the odd one out." : null}
        {phase === "playing" ? <span data-testid="quick-ai-status">{aiCaption}</span> : null}
        {phase === "reveal" && result ? (
          <>
            <b data-testid="quick-result">{result.winner === "you" ? "You win!" : result.winner === "ai" ? "AI wins" : "No winner"}</b>{" "}
            {result.you === "correct" ? `You found it in ${fmt(result.youMs ?? 0)}.` : result.you === "wrong" ? "Wrong cell." : "Time's up."} AI{" "}
            {result.aiCorrect ? `found it in ${fmt(result.aiMs)}.` : `picked the wrong cell (${fmt(result.aiMs)}).`}{" "}
            <button type="button" className="quick-next" data-testid="quick-next" onClick={next}>
              {round + 1 >= mode.grids.length ? "See score" : "Next puzzle ▶"}
            </button>
          </>
        ) : null}
        {phase === "done" ? "Three puzzles done." : null}
      </div>
    </section>
  );
}
