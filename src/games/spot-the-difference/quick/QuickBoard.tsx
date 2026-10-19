"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUICK_PRESENCE } from "@/config/ai-presence";
import { track } from "@/lib/api-client";
import { planQuickAnswer } from "./quick-ai";
import { makePuzzle, QUICK_MODES, type QuickModeKey } from "./puzzle";
import { SpriteDefs, SpriteUse } from "./PixelSprite";
import "./quick.css";

type Phase = "demo" | "ready" | "playing" | "reveal" | "done";
type StartTrigger = "tap" | "demo_end" | "play" | "again";
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

/** Demo timeline (ms): decoy cells light up one after another, then the odd one; play starts at DEMO_END_MS. */
export const DEMO_DECOYS = 3;
const DEMO_STEP_MS = 520;
const DEMO_FOUND_MS = 300 + DEMO_DECOYS * DEMO_STEP_MS;
export const DEMO_END_MS = DEMO_FOUND_MS + 1300;

/**
 * Instant spot-the-difference board: plays entirely in the browser against the in-game simulated AI
 * (same engine as the ranked game), never touches the server or the daily run limit.
 *
 * `demo` (home hero, plan "Approved v2"): no Play button on the board. A ~3 s demo on a separate demo puzzle
 * highlights cells in sequence and then the odd one; tapping any cell skips it, and the demo ending starts
 * play in place (timer starts, no navigation). Reduced motion: no animation, tap a cell to start.
 */
export function QuickBoard({
  mode: modeKey,
  seed,
  title,
  cta,
  startLabel,
  demo = false,
  page = "",
}: {
  mode: QuickModeKey;
  seed: string;
  title: string;
  cta?: React.ReactNode;
  /** Text on the in-board start button (keyword pages: e.g. "Tap to play an easy round"). */
  startLabel?: string;
  demo?: boolean;
  /** Page path for analytics metadata. */
  page?: string;
}) {
  const mode = QUICK_MODES[modeKey];
  const [series, setSeries] = useState(seed);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>(demo ? "demo" : "ready");
  const [demoStep, setDemoStep] = useState(-1);
  const stageRef = useRef<HTMLDivElement>(null);
  const demoViewed = useRef(false);
  const [now, setNow] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const startRef = useRef(0);

  const realPuzzle = useMemo(() => makePuzzle(`${series}|${round}`, { theme: mode.theme, grid: mode.grids[round], changes: mode.changes }), [series, round, mode]);
  // Demo uses its own seed so it never gives away the first real puzzle.
  const demoPuzzle = useMemo(() => makePuzzle(`${seed}|demo`, { theme: mode.theme, grid: mode.grids[0], changes: mode.changes }), [seed, mode]);
  const puzzle = phase === "demo" ? demoPuzzle : realPuzzle;
  const demoDecoys = useMemo(() => {
    const total = demoPuzzle.grid * demoPuzzle.grid;
    const picks: number[] = [];
    for (let k = 1; picks.length < DEMO_DECOYS && k < total * 3; k += 1) {
      const cell = (demoPuzzle.oddIndex + k * 7) % total;
      if (cell !== demoPuzzle.oddIndex && !picks.includes(cell)) picks.push(cell);
    }
    return picks;
  }, [demoPuzzle]);
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
  const prefix = phase === "demo" ? `q-${modeKey}-demo` : `q-${modeKey}-${round}`;
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

  const start = useCallback(() => {
    const t = performance.now();
    startRef.current = t;
    setStartedAt(t);
    setNow(t);
    setPhase("playing");
  }, []);

  /** Leave the demo (or the reduced-motion still) and play the first real puzzle in place. */
  const startFromDemo = useCallback(
    (trigger: StartTrigger, stepAtTap: number) => {
      if (trigger === "tap" && stepAtTap >= 0) track("demo_skip", { metadata: { page, atMs: Math.round(Math.min(DEMO_END_MS, 300 + stepAtTap * DEMO_STEP_MS)) } });
      track("board_start", { metadata: { page, trigger } });
      setDemoStep(-1);
      start();
    },
    [page, start],
  );

  // Demo timeline: runs only while the board is on screen and the tab is visible; restarts from 0 when it comes back.
  useEffect(() => {
    if (phase !== "demo" || !demo) return;
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timers: number[] = [];
    let visible = false;
    const stop = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
      setDemoStep(-1);
    };
    const run = () => {
      stop();
      if (!demoViewed.current) {
        demoViewed.current = true;
        track("demo_view", { metadata: { page } });
      }
      for (let i = 0; i <= DEMO_DECOYS; i += 1) timers.push(window.setTimeout(() => setDemoStep(i), 300 + i * DEMO_STEP_MS));
      timers.push(window.setTimeout(() => startFromDemo("demo_end", -1), DEMO_END_MS));
    };
    const sync = () => {
      const active = visible && document.visibilityState === "visible";
      if (active && timers.length === 0) run();
      else if (!active && timers.length > 0) stop();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6);
        sync();
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, demo, page, startFromDemo]);

  const next = () => {
    if (round + 1 >= mode.grids.length) return setPhase("done");
    setRound(round + 1);
    start();
  };
  const again = () => {
    setSeries(`${seed}-${Math.random().toString(36).slice(2, 8)}`);
    setResults([]);
    setRound(0);
    if (!demo) return setPhase("ready");
    // Hero board: never put a Play button back over the cells; a new match starts right away.
    track("board_start", { metadata: { page, trigger: "again" } });
    start();
  };

  const youWins = results.filter((r) => r?.winner === "you").length;
  const aiWins = results.filter((r) => r?.winner === "ai").length;
  const remaining = Math.max(0, limitMs - elapsed);

  return (
    <section className={`quick${demo ? " quick-hero" : ""}`} data-testid="quick-board" data-phase={phase} data-demo-step={phase === "demo" ? demoStep : undefined} aria-label={title}>
      <div className="quick-hud">
        <span className="quick-round">
          Puzzle {round + 1}/{mode.grids.length} · {puzzle.grid}×{puzzle.grid}
        </span>
        <span className="quick-score" data-testid="quick-score">
          YOU {youWins} – {aiWins} AI
        </span>
        <span className="quick-clock" aria-live="off">
          {phase === "playing" ? fmt(remaining) : phase === "demo" ? "DEMO" : fmt(limitMs)}
        </span>
      </div>
      <div className="quick-stage" ref={stageRef}>
        <SpriteDefs prefix={prefix} sprites={[puzzle.base, puzzle.odd]} />
        <div className="quick-grid" style={{ gridTemplateColumns: `repeat(${puzzle.grid}, 1fr)` }} role="group" aria-label={`${puzzle.grid} by ${puzzle.grid} picture grid`}>
          {Array.from({ length: cells }, (_, i) => {
            const isOdd = i === puzzle.oddIndex;
            const decoyAt = demoDecoys.indexOf(i);
            const state =
              phase === "demo"
                ? isOdd && demoStep >= DEMO_DECOYS
                  ? "odd"
                  : decoyAt >= 0 && demoStep === decoyAt
                    ? "scan"
                    : ""
                : phase === "reveal" || phase === "done"
                  ? isOdd
                    ? "odd"
                    : result?.pick === i
                      ? "miss"
                      : result?.aiPick === i
                        ? "ai"
                        : ""
                  : "";
            return (
              <button
                key={i}
                type="button"
                className="quick-cell"
                data-state={state || undefined}
                data-ai={(phase === "reveal" || phase === "done") && result?.aiPick === i ? "true" : undefined}
                data-testid="quick-cell"
                aria-label={`Row ${Math.floor(i / puzzle.grid) + 1}, column ${(i % puzzle.grid) + 1}`}
                disabled={phase !== "playing" && phase !== "demo"}
                onClick={() => (phase === "demo" ? startFromDemo("tap", demoStep) : finish(i))}
              >
                <SpriteUse href={`${prefix}-${isOdd ? puzzle.odd.id : puzzle.base.id}`} />
              </button>
            );
          })}
        </div>
        {phase === "demo" ? (
          <div className="quick-demo-tag" data-testid="quick-demo" aria-hidden>
            <span className="quick-demo-badge">▶ DEMO</span>
          </div>
        ) : null}
        {phase === "ready" ? (
          <div className="quick-overlay">
            <button type="button" className={`quick-play${startLabel ? " quick-play-label" : ""}`} data-testid="quick-start" onClick={start}>
              ▶ {startLabel ?? "Play"}
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
            {cta ?? (demo ? <p className="quick-up">Ready for all 20 levels? Hit Play Spot the Difference.</p> : null)}
            <button type="button" className="quick-again" onClick={again}>
              New puzzles ↻
            </button>
          </div>
        ) : null}
      </div>
      <div className="quick-caption" data-testid="quick-caption" aria-live="polite">
        {phase === "ready" ? (startLabel ? "Start the round, then tap the odd one out." : "Tap Play, then tap the odd one out.") : null}
        {phase === "demo" ? (
          <span data-testid="quick-demo-caption">
            {demoStep >= DEMO_DECOYS ? "Found the odd one! Your turn — tap any picture to play." : demoStep >= 0 ? "Not this one… keep looking." : "Find the one picture that's different before the AI does. Tap any picture to play."}
          </span>
        ) : null}
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
