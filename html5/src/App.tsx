import { useCallback, useEffect, useRef, useState } from "react";
import { GameBoard } from "@/components/GameBoard";
import { RevealHeatmapBoard } from "@/components/RevealHeatmapBoard";
import { VsRaceBar } from "@/components/VsRaceBar";
import { GameHud } from "@/components/game/GameHud";
import { GameStage } from "@/components/game/GameStage";
import { Badge, Button } from "@/components/ui/8bit";
import { KoMark, ResultBanner, StreakCounter, type BannerOutcome } from "@/core/fx/Banners";
import { shake, sparkBurst } from "@/core/fx/dom";
import { MuteToggle } from "@/core/fx/MuteToggle";
import { hapticFx, installAudioUnlockListeners, playSfx } from "@/core/fx/sfx";
import { TOTAL_LEVELS, type RoundReveal } from "@/game/contracts";
import { describeReveal } from "@/game/reveal-copy";
import { pad2, seconds } from "@/lib/format";
import type { SimulatedPlan } from "@/models/adapters/simulated";
import { levelFor, loadBest, loadSession, newSession, planAi, recordBest, saveSession, settle, type Html5Session } from "./session";

declare const __HTML5_VERSION__: string;
declare const __HTML5_CTA__: boolean;
declare const __HTML5_CTA_URL__: string;

type Phase =
  | { kind: "title" }
  | { kind: "countdown"; value: number | string }
  | { kind: "play"; plan: SimulatedPlan }
  | { kind: "reveal"; reveal: RoundReveal; next: Html5Session }
  | { kind: "over" };

const VersionLine = () => <p className="h5-version" data-testid="version">{__HTML5_VERSION__}</p>;
const TopBar = ({ onQuit }: { onQuit: () => void }) => (
  <header className="game-topbar">
    <span className="game-crumb">Spot the Difference · Human vs AI</span>
    <span className="game-topbar-spacer" />
    <MuteToggle />
    <Button variant="secondary" className="game-exit" data-testid="quit" onClick={onQuit}>Menu</Button>
  </header>
);

export function App() {
  const [session, setSession] = useState<Html5Session | null>(() => loadSession());
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [remaining, setRemaining] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState({ combo: 0, streak: 0 });
  const shownAt = useRef<number | null>(null);
  const settled = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const countdownTimer = useRef<number | null>(null);

  useEffect(() => {
    installAudioUnlockListeners();
  }, []);

  const startLevel = useCallback((s: Html5Session) => {
    setSelected(null);
    shownAt.current = null;
    settled.current = false;
    setRemaining(null);
    const steps: (number | string)[] = [3, 2, 1, "FIGHT!"];
    let i = 0;
    setPhase({ kind: "countdown", value: steps[0] });
    playSfx("beep");
    if (countdownTimer.current !== null) window.clearInterval(countdownTimer.current);
    const timer = window.setInterval(() => {
      i += 1;
      if (i < steps.length) {
        setPhase({ kind: "countdown", value: steps[i] });
        playSfx(i === steps.length - 1 ? "fight" : "beep");
      } else {
        window.clearInterval(timer);
        countdownTimer.current = null;
        setPhase({ kind: "play", plan: planAi(s, levelFor(s.level)) });
      }
    }, 550);
    countdownTimer.current = timer;
  }, []);

  const finish = useCallback(
    (choice: string | null) => {
      if (!session || phase.kind !== "play" || settled.current) return;
      settled.current = true;
      const level = levelFor(session.level);
      const elapsed = shownAt.current === null ? level.limitMs + 1 : performance.now() - shownAt.current;
      const { reveal, session: next } = settle(session, level, phase.plan, choice, elapsed);
      setStreak((prev) => ({
        combo: reveal.human?.status === "correct" ? prev.combo + 1 : 0,
        streak: reveal.winner === "human" ? prev.streak + 1 : 0,
      }));
      saveSession(next);
      if (next.ended) recordBest(next);
      setPhase({ kind: "reveal", reveal, next });
    },
    [session, phase],
  );

  // Countdown clock during play; starts once the raster is painted.
  useEffect(() => {
    if (phase.kind !== "play" || !session) return;
    const limit = levelFor(session.level).limitMs;
    let raf = 0;
    const tick = () => {
      if (shownAt.current !== null) {
        const left = limit - (performance.now() - shownAt.current);
        setRemaining(Math.max(0, left));
        if (left <= 0) return finish(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, session, finish]);

  // Reveal FX (same feel kit as the main site's LevelReveal).
  useEffect(() => {
    if (phase.kind !== "reveal") return;
    const r = phase.reveal;
    const ok = r.human?.status === "correct";
    const host = boardRef.current;
    const cell = r.human?.choice ? host?.querySelector(`[data-answer="${CSS.escape(r.human.choice)}"]`) : null;
    sparkBurst(cell ?? null, ok ? "hit" : "miss");
    shake(host?.firstElementChild ?? null, { freezeMs: ok ? 60 : 0 });
    hapticFx(ok ? "hit" : "miss");
    playSfx(r.winner === "human" ? "win" : r.winner === "ai" ? "lose" : ok ? "hit" : "miss");
  }, [phase]);

  // Back to the title screen; the saved session stays resumable (no external navigation in any build).
  const toTitle = () => {
    settled.current = true;
    if (countdownTimer.current !== null) window.clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    setPhase({ kind: "title" });
  };

  const begin = (resume: boolean) => {
    const s = resume && session ? session : newSession();
    setSession(s);
    saveSession(s);
    setStreak({ combo: 0, streak: 0 });
    startLevel(s);
  };

  const onNext = useCallback(() => {
    if (phase.kind !== "reveal") return;
    setSession(phase.next);
    if (phase.next.ended) setPhase({ kind: "over" });
    else startLevel(phase.next);
  }, [phase, startLevel]);

  useEffect(() => {
    if (phase.kind !== "reveal") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, onNext]);

  if (phase.kind === "title" || !session) {
    const best = loadBest();
    return (
      <main className="h5-screen" data-testid="title">
        <h1>Spot the Difference<br />Human vs AI</h1>
        <p>Find the odd tile before the AI does. 20 levels, 3 chances.</p>
        {best ? <p className="h5-stats" data-testid="best">Best: level {pad2(best.reachedLevel)}{best.cleared ? " · cleared" : ""}</p> : null}
        <Button variant="primary" data-testid="start" onClick={() => begin(false)}>{session ? "New run" : "Play"}</Button>
        {session ? <Button variant="secondary" data-testid="resume" onClick={() => begin(true)}>Continue level {pad2(session.level)}</Button> : null}
        <VersionLine />
      </main>
    );
  }

  if (phase.kind === "over") {
    const reached = session.cleared ? TOTAL_LEVELS : session.level;
    return (
      <main className="h5-screen" data-testid="game-over">
        <h1>{session.cleared ? "All 20 cleared!" : "Game over"}</h1>
        <p className="h5-stats" data-testid="final-level">Reached level {pad2(reached)} / {TOTAL_LEVELS}</p>
        <p>Faster than the AI on {session.fasterThanAiCount} level{session.fasterThanAiCount === 1 ? "" : "s"}.</p>
        <Button variant="primary" data-testid="play-again" onClick={() => begin(false)}>Play again</Button>
        {__HTML5_CTA__ ? (
          <p data-testid="soft-cta">More levels &amp; daily challenge: <a href={__HTML5_CTA_URL__} target="_blank" rel="noopener">spotthedifferencegame.com</a></p>
        ) : null}
        <VersionLine />
      </main>
    );
  }

  const level = levelFor(session.level);

  if (phase.kind === "reveal") {
    const r = phase.reveal;
    const copy = describeReveal(r, "en");
    const outcome: BannerOutcome = r.winner === "human" ? "win" : r.winner === "ai" ? "lose" : "draw";
    const humanMs = r.human && r.human.status !== "timeout" ? r.human.elapsedMs : null;
    const nextLabel = phase.next.ended ? "See result" : "Next level";
    return (
      <GameStage
        phase="reveal"
        topBar={<TopBar onQuit={toTitle} />}
        hud={
          <div className="verdict-card" data-symbol={copy.symbol}>
            <span className="result-symbol" aria-hidden>{copy.symbol}</span>
            <div className="verdict-copy">
              <p className="verdict-eyebrow">Level {pad2(r.level)} · Reveal</p>
              <h1 className="verdict-title" data-testid="verdict">{copy.title}</h1>
              <p className="verdict-detail">{copy.detail}</p>
            </div>
          </div>
        }
        lane={null}
        board={
          <div className="fx-board-host" ref={boardRef}>
            <RevealHeatmapBoard gridSize={r.gridSize} imageUrl={r.imageUrl} probabilities={r.ai.probabilities} aiChoice={r.ai.choice} correctChoice={r.correctChoice} humanChoice={r.human?.choice ?? null} />
            <ResultBanner key={`${r.id}-${outcome}`} outcome={outcome} />
            <div className="fx-board-badges">
              {r.ai.correct === false ? <KoMark /> : null}
              <StreakCounter combo={streak.combo} streak={streak.streak} />
            </div>
          </div>
        }
        foot={<Button variant="primary" className="reveal-next num" data-testid="reveal-next" onClick={onNext}>{nextLabel}</Button>}
        side={
          <div className="race-card">
            <VsRaceBar humanLabel="You" humanMs={humanMs} aiMs={r.ai.elapsedMs} />
            <p className="faster-note">AI {seconds(r.ai.elapsedMs ?? 0)} · {r.ai.correct ? "correct" : "wrong"} · chances left {phase.next.lives}</p>
          </div>
        }
      />
    );
  }

  const aiAnswered = phase.kind === "play" && remaining !== null && level.limitMs - remaining >= phase.plan.thinkMs;
  return (
    <GameStage
      phase={phase.kind}
      topBar={<TopBar onQuit={toTitle} />}
      hud={<GameHud level={session.level} chances={session.lives} remainingMs={remaining} limitMs={level.limitMs} badge={<StreakCounter combo={streak.combo} streak={streak.streak} />} />}
      lane={null}
      board={
        <GameBoard
          gridSize={level.gridSize}
          imageUrl={phase.kind === "play" ? level.imageUrl : null}
          disabled={phase.kind !== "play" || selected !== null}
          selected={selected}
          onChoose={(choice) => {
            setSelected(choice);
            playSfx("tap");
            finish(choice);
          }}
          onImagePainted={() => {
            if (shownAt.current === null) shownAt.current = performance.now();
          }}
        />
      }
      overlay={
        phase.kind === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            <span key={String(phase.value)} className={typeof phase.value === "string" ? "fx-fight" : undefined}>{phase.value}</span>
          </div>
        ) : null
      }
      foot={<span className="game-hint">Tap the tile that is different</span>}
      side={
        <div className="vs-card" data-testid="vs-status">
          <div className="vs-row"><Badge variant="human">You</Badge><span className="vs-state">{phase.kind === "play" ? "Searching…" : "Get ready"}</span></div>
          <div className="vs-row"><Badge variant="ai">AI</Badge><span className="vs-state" data-testid="ai-status">{aiAnswered ? "Locked in" : phase.kind === "play" ? "Scanning…" : "Ready"}</span></div>
        </div>
      }
    />
  );
}
