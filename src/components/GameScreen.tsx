"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiEvent, PublicLevel, RoundReveal, SessionSnapshot } from "@/game/contracts";
import { spotTheDifferenceClient } from "@/games/spot-the-difference/client-plugin";
import type { ClientGamePlugin } from "@/core/client-game";
import { getGame } from "@/games/registry";
import { playSfx, unlockAudio } from "@/core/fx/sfx";
import { StreakCounter } from "@/core/fx/Banners";
import { streaks, type LevelOutcome } from "@/core/fx/result-grid";
import { aiStatusLabel, buildAiEventSteps } from "@/game/ai-activity";
import { AiActivityPanel } from "./AiActivityPanel";
import { AiDanmakuLane } from "./AiDanmakuLane";
import { DetailsSheet } from "./DetailsSheet";
import { danmakuFromActivitySteps } from "@/game/danmaku-messages";
import { api, ApiError, haptic, track, withRetry } from "@/lib/api-client";
import { pad2 } from "@/lib/format";
import { AiTerminal } from "./game/AiTerminal";
import { GameHud } from "./game/GameHud";
import { GameStage } from "./game/GameStage";
import { GameTopBar } from "./game/GameTopBar";
import { LevelReveal } from "./LevelReveal";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/config";
import { Badge, Button } from "@/components/ui/8bit";

const SLOW_LOADING_MS = 800;
const AI_POLL_MS = 500;
const AI_POLL_LIMIT_MS = 15_000;
/** While waiting on the board: poll as a backup to the stream, and give up (reveal anyway) after limit + slack. */
const WAIT_POLL_MS = 1_000;
const WAIT_SLACK_MS = 3_000;

type Phase =
  | { kind: "loading" }
  | { kind: "countdown"; value: number | string }
  | { kind: "playing" }
  | { kind: "submitting" }
  /** Human locked and settled; the board stays while the real AI is still analysing. */
  | { kind: "waiting" }
  | { kind: "reveal" }
  | { kind: "error"; message: string; action: "reload" | "resubmit" };

const imageCache = new Map<string, Promise<void>>();

export function preloadImage(url: string): Promise<void> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      image
        .decode()
        .catch(() => undefined)
        .then(() => resolve());
    };
    image.onerror = () => reject(new Error("image_failed"));
    image.src = url;
  });
  promise.catch(() => imageCache.delete(url));
  imageCache.set(url, promise);
  return promise;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Core game screen: session/round lifecycle, server-initiated AI race, lock-in/waiting, HUD, AI terminal,
 * danmaku and reveal. Game specifics (board, input, level assets, hint) come from the client plugin.
 */
export function GameScreen({ sessionId, game = spotTheDifferenceClient as unknown as ClientGamePlugin<PublicLevel> }: { sessionId: string; game?: ClientGamePlugin<PublicLevel> }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [level, setLevel] = useState<PublicLevel | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [painted, setPainted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RoundReveal | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [slowEpoch, setSlowEpoch] = useState(-1);
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);
  /** Real AI events streamed by /start: the server runs the AI the moment the board is shown. */
  const [aiEvents, setAiEvents] = useState<AiEvent[]>([]);
  const aiEventsRef = useRef<AiEvent[]>([]);
  const aiRoundRef = useRef<string | null>(null);

  const roundIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const beginRef = useRef<Promise<unknown> | null>(null);
  const lockedRef = useRef(false);
  const pendingSubmitRef = useRef<{ choice: string | null; elapsedMs: number } | null>(null);
  const countdownShownRef = useRef(false);
  const mountedRef = useRef(true);
  const livesRef = useRef<number | null>(null);
  const bootRef = useRef<() => Promise<void>>(async () => undefined);
  const advancingRef = useRef(false);
  /** Next round fetched during the reveal (never shown, so its AI has not started). */
  const prefetchRef = useRef<{ forRound: string; promise: Promise<Awaited<ReturnType<typeof api.startNextRound>>> } | null>(null);
  const [waitingMs, setWaitingMs] = useState<number | null>(null);
  /** F6: per-run history for COMBO (consecutive correct) / STREAK (consecutive wins over the AI). */
  const historyRef = useRef<Map<string, { humanCorrect: boolean; winner: LevelOutcome }>>(new Map());
  const [streak, setStreak] = useState({ combo: 0, streak: 0 });

  const pushAiEvent = useCallback((roundId: string, event: AiEvent) => {
    if (aiRoundRef.current !== roundId) return;
    if (aiEventsRef.current.some((existing) => existing.event === event.event)) return;
    aiEventsRef.current = [...aiEventsRef.current, event];
    setAiEvents(aiEventsRef.current);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    livesRef.current = session?.lives ?? null;
  }, [session]);

  const goToResult = useCallback(
    (snapshot: SessionSnapshot) => {
      if (snapshot.publicId) router.push(`/result/${snapshot.publicId}`);
      else router.push(localePath(locale, "/"));
    },
    [router, locale],
  );

  const showReveal = useCallback(
    (round: RoundReveal, next: SessionSnapshot, previousLives: number | null) => {
      if (round.human) {
        const winner: LevelOutcome = round.winner === "human" ? "human" : round.winner === "ai" ? "ai" : round.ai.status === "error" ? "void" : "none";
        historyRef.current.set(round.id, { humanCorrect: round.human.status === "correct", winner });
        setStreak(streaks([...historyRef.current.values()]));
      }
      setReveal(round);
      setSession(next);
      if (previousLives !== null && next.lives < previousLives) haptic();
      advancingRef.current = false;
      setPhase({ kind: "reveal" });
    },
    [],
  );

  const waitForAi = useCallback(
    async (roundId: string, settled: Awaited<ReturnType<typeof api.submitRound>>, previousLives: number | null) => {
      const limitMs = game.publicLevel(settled.round.level)?.limitMs ?? 10_000;
      const giveUpAt = (startedAtRef.current ?? performance.now()) + limitMs + WAIT_SLACK_MS;
      let latest = settled;
      let lastPoll = performance.now();
      while (mountedRef.current && roundIdRef.current === roundId) {
        const final = aiEventsRef.current.some((event) => event.event === "answered" || event.event === "error");
        const pollDue = performance.now() - lastPoll >= WAIT_POLL_MS;
        if (final || pollDue || performance.now() >= giveUpAt) {
          lastPoll = performance.now();
          try {
            latest = await api.getRound(roundId);
          } catch {
            // Keep the settled snapshot; the reveal's own late-fill poll takes over.
          }
          const done = latest.round.ai.status === "complete" || latest.round.ai.status === "error";
          if (done || performance.now() >= giveUpAt) break;
        }
        await sleep(final ? 150 : 100);
      }
      if (!mountedRef.current || roundIdRef.current !== roundId) return;
      showReveal(latest.round, latest.session, previousLives);
    },
    [showReveal, game],
  );

  const sendSubmission = useCallback(async () => {
    const roundId = roundIdRef.current;
    const submission = pendingSubmitRef.current;
    if (!roundId || !submission) return;
    setPhase({ kind: "submitting" });
    try {
      await withRetry(async () => {
        if (beginRef.current) await beginRef.current.catch(() => undefined);
        beginRef.current = null;
        try {
          return await api.submitRound(roundId, submission);
        } catch (error) {
          if (error instanceof ApiError && error.code === "round_not_started") beginRef.current = api.beginRoundStream(roundId, (event) => pushAiEvent(roundId, event));
          throw error;
        }
      }).then((response) => {
        if (!mountedRef.current) return;
        track("player_answered", { sessionId, level: response.round.level, metadata: { status: response.round.human?.status ?? null } });
        pendingSubmitRef.current = null;
        const previousLives = livesRef.current;
        const aiPending = response.round.ai.status === "running" || response.round.ai.status === "pending";
        if (!aiPending || aiRoundRef.current !== roundId) {
          showReveal(response.round, response.session, previousLives);
          return;
        }
        // Keep the board: "你已锁定 / AI 还在分析 x.xs" until the real AI's final event (or a poll) arrives.
        setSession(response.session);
        setPhase({ kind: "waiting" });
        void waitForAi(roundId, response, previousLives);
      });
    } catch {
      if (mountedRef.current) setPhase({ kind: "error", message: t("网络不稳定，答案已锁定，请重试提交。"), action: "resubmit" });
    }
  }, [sessionId, showReveal, waitForAi, pushAiEvent, t]);

  const lockAnswer = useCallback(
    (choice: string | null) => {
      if (lockedRef.current || startedAtRef.current === null || !level) return;
      lockedRef.current = true;
      setLocked(true);
      const elapsedMs = choice === null ? level.limitMs : Math.round(performance.now() - startedAtRef.current);
      setSelected(choice);
      if (choice === null) setRemainingMs(0);
      haptic();
      unlockAudio();
      playSfx("tap");
      pendingSubmitRef.current = { choice, elapsedMs: Math.min(elapsedMs, 60_000) };
      void sendSubmission();
    },
    [level, sendSubmission],
  );

  const loadNextRound = useCallback(async () => {
    setPhase({ kind: "loading" });
    setReveal(null);
    setSelected(null);
    setImageReady(false);
    setPainted(false);
    setRemainingMs(null);
    aiEventsRef.current = [];
    aiRoundRef.current = null;
    setAiEvents([]);
    setLocked(false);
    setLoadEpoch((value) => value + 1);
    lockedRef.current = false;
    startedAtRef.current = null;
    beginRef.current = null;
    setWaitingMs(null);
    const prefetched = prefetchRef.current;
    prefetchRef.current = null;
    try {
      const response = await (prefetched ? prefetched.promise.catch(() => withRetry(() => api.startNextRound(sessionId), 3)) : withRetry(() => api.startNextRound(sessionId), 3));
      if (!mountedRef.current) return;
      roundIdRef.current = response.round.id;
      setSession(response.session);
      setLevel(response.level);
      setRemainingMs(response.level.limitMs);

      const preload = Promise.all(game.assetUrls(response.level).map((url) => preloadImage(url))).then(() => undefined);
      if (response.level.level === 1 && !countdownShownRef.current) {
        countdownShownRef.current = true;
        // F7: 3-2-1 FIGHT! with a beep per beat. The AI cannot start before the board is painted.
        for (const value of [3, 2, 1]) {
          if (!mountedRef.current) return;
          setPhase({ kind: "countdown", value });
          playSfx("beep");
          await sleep(1000);
        }
        if (!mountedRef.current) return;
        setPhase({ kind: "countdown", value: "FIGHT!" });
        playSfx("fight");
        await sleep(500);
      }
      await preload;
      if (!mountedRef.current) return;
      const next = game.publicLevel(response.level.level + 1);
      if (next) for (const url of game.assetUrls(next)) void preloadImage(url).catch(() => undefined);
      setImageReady(true);
      setPhase({ kind: "playing" });
      advancingRef.current = false;
    } catch (error) {
      if (!mountedRef.current) return;
      advancingRef.current = false;
      if (error instanceof ApiError && error.code === "session_ended") {
        goToResult(await api.getSession(sessionId));
        return;
      }
      if (error instanceof ApiError && error.code === "round_in_progress") {
        void bootRef.current();
        return;
      }
      setPhase({ kind: "error", message: error instanceof ApiError && error.status === 404 ? t("找不到这局挑战。") : t("关卡加载失败，不会扣除机会。"), action: "reload" });
    }
  }, [sessionId, goToResult, t, game]);

  const boot = useCallback(async () => {
    try {
      const snapshot = await api.getSession(sessionId);
      if (!mountedRef.current) return;
      setSession(snapshot);
      if (snapshot.status === "ended") {
        goToResult(snapshot);
        return;
      }
      if (snapshot.activeRound?.shown) {
        // A level that was already on screen before a refresh is settled as a timeout.
        roundIdRef.current = snapshot.activeRound.id;
        aiRoundRef.current = snapshot.activeRound.id;
        lockedRef.current = true;
        pendingSubmitRef.current = { choice: null, elapsedMs: 60_000 };
        countdownShownRef.current = true;
        await sendSubmission();
        return;
      }
      if (snapshot.level > 1) countdownShownRef.current = true;
      await loadNextRound();
    } catch (error) {
      if (!mountedRef.current) return;
      setPhase({ kind: "error", message: error instanceof ApiError && error.status === 404 ? t("找不到这局挑战。") : t("网络不稳定，请重试。"), action: "reload" });
    }
  }, [sessionId, goToResult, loadNextRound, sendSubmission, t]);

  useEffect(() => {
    bootRef.current = boot;
  }, [boot]);

  const bootedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (bootedForRef.current === sessionId) return;
    bootedForRef.current = sessionId;
    void bootRef.current();
  }, [sessionId]);

  const onImagePainted = useCallback(() => {
    if (startedAtRef.current !== null || !roundIdRef.current) return;
    startedAtRef.current = performance.now();
    setPainted(true);
    const roundId = roundIdRef.current;
    aiRoundRef.current = roundId;
    const begin = withRetry(() => api.beginRoundStream(roundId, (event) => pushAiEvent(roundId, event)), 3);
    // The submission only needs the round to be marked shown; it never waits for the AI.
    beginRef.current = begin;
    void begin.catch(() => undefined);
  }, [pushAiEvent]);

  // Absolute-deadline countdown; backgrounding the page does not pause it.
  useEffect(() => {
    if (phase.kind !== "playing" || !painted || !level) return;
    let frame = 0;
    const tick = () => {
      if (startedAtRef.current === null || lockedRef.current) return;
      const remaining = level.limitMs - (performance.now() - startedAtRef.current);
      if (remaining <= 0) {
        lockAnswer(null);
        return;
      }
      setRemainingMs(remaining);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    const fallback = window.setInterval(tick, 250);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase.kind, painted, level, lockAnswer]);

  // Loading indicator only after 800ms to avoid flashes.
  useEffect(() => {
    if (phase.kind !== "loading") return;
    const timer = window.setTimeout(() => setSlowEpoch(loadEpoch), SLOW_LOADING_MS);
    return () => window.clearTimeout(timer);
  }, [phase.kind, loadEpoch]);

  const advance = useCallback(() => {
    if (!session || advancingRef.current) return;
    advancingRef.current = true;
    setReveal(null);
    setPhase({ kind: "loading" });
    if (session.status === "ended") {
      advancingRef.current = false;
      goToResult(session);
      return;
    }
    void loadNextRound();
  }, [session, goToResult, loadNextRound]);

  // Real counter while the human waits on the board for the AI (from the moment the board was painted).
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const tick = () => setWaitingMs(startedAtRef.current === null ? null : performance.now() - startedAtRef.current);
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [phase.kind]);

  // During the reveal, fetch the next round + its image so 下一关 is instant. The round is not shown,
  // so its AI never starts early (the AI only starts when the next board is painted).
  useEffect(() => {
    if (phase.kind !== "reveal" || !reveal || !session || session.status !== "active") return;
    if (prefetchRef.current?.forRound === reveal.id) return;
    const promise = api.startNextRound(sessionId);
    prefetchRef.current = { forRound: reveal.id, promise };
    void promise.then((next) => Promise.all(game.assetUrls(next.level).map((url) => preloadImage(url)))).catch(() => undefined);
  }, [phase.kind, reveal, session, sessionId, game]);

  // A late AI answer is filled in without touching lives or level.
  useEffect(() => {
    if (phase.kind !== "reveal" || !reveal || (reveal.ai.status !== "running" && reveal.ai.status !== "pending")) return;
    const roundId = reveal.id;
    const startedAt = Date.now();
    let cancelled = false;
    const poll = async () => {
      while (!cancelled && Date.now() - startedAt < AI_POLL_LIMIT_MS) {
        await sleep(AI_POLL_MS);
        if (cancelled) return;
        try {
          const response = await api.getRound(roundId);
          if (cancelled) return;
          if (response.round.ai.status === "complete" || response.round.ai.status === "error") {
            setReveal(response.round);
            setSession(response.session);
            return;
          }
        } catch {
          // Keep polling; the reveal already shows the player's settled result.
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [phase.kind, reveal]);

  const displayLevel = level?.level ?? session?.level ?? 1;
  const boardLevel = level ?? game.publicLevel(displayLevel);
  const limit = boardLevel?.limitMs ?? 0;
  const Board = game.Board;
  const crumb = `${game.title(t)} / ${t("第 {n} 关", { n: pad2(displayLevel) })}`;

  if (phase.kind === "reveal" && reveal && session) {
    return (
      <LevelReveal
        round={reveal}
        fasterThanAiCount={session.fasterThanAiCount}
        ended={session.status === "ended"}
        onNext={advance}
        game={game}
        streak={streak}
        browserAiActivity={aiEvents.length ? { steps: buildAiEventSteps(aiEvents, { locale, reveal }), capturedAt: 0 } : null}
        topBar={<GameTopBar crumb={`${game.title(t)} / ${t("第 {n} 关", { n: pad2(reveal.level) })}`} exitPath={game.exitPath} />}
      />
    );
  }

  const remaining = remainingMs ?? limit;
  const interactive = phase.kind === "playing" && painted && !locked;
  const slowLoading = phase.kind === "loading" && slowEpoch === loadEpoch;
  const terminalSteps = buildAiEventSteps(aiEvents, { locale, waitingMs: phase.kind === "waiting" ? waitingMs : null });
  // Danmaku stays quiet: built without the ticking "已用 x.xs" detail so a running counter never spawns lines.
  const danmakuMessages = danmakuFromActivitySteps(buildAiEventSteps(aiEvents, { locale }), true, locale);
  const waiting = phase.kind === "waiting";
  const aiNowLabel = aiStatusLabel(aiEvents, { locale, locked, waitingMs: waiting ? waitingMs : null });
  const humanNow = waiting ? t("你已锁定") : locked || phase.kind === "submitting" ? t("答案已锁定") : interactive ? t("作答中…") : t("准备中");

  const board =
    phase.kind === "error" ? (
      <div className="board board-message" data-testid="board">
        <p className="inline-error">{phase.message}</p>
      </div>
    ) : (
      boardLevel ? (
        <Board
          level={boardLevel}
          ready={imageReady && level !== null}
          disabled={!interactive}
          selected={selected}
          loadingLabel={slowLoading ? t("正在加载关卡") : null}
          onChoose={lockAnswer}
          onPainted={onImagePainted}
        />
      ) : (
        <div className="board" data-testid="board" />
      )
    );

  const foot =
    phase.kind === "error" ? (
      <div className="game-foot-actions">
        <Button
          variant="primary"
          onClick={() => {
            if (phase.action === "resubmit") void sendSubmission();
            else void boot();
          }}
        >
          {phase.action === "resubmit" ? t("重试提交") : t("重新加载关卡")}
        </Button>
        <Button variant="text" onClick={() => router.push(localePath(locale, getGame(game.slug)?.landingPath ?? "/games"))}>
          {t("返回首页")}
        </Button>
      </div>
    ) : (
      <>
        {waiting ? (
          <span className="game-hint game-wait" data-testid="ai-waiting" aria-live="polite">
            ▸ {t("你已锁定")} · {aiNowLabel}
          </span>
        ) : (
          <span className="game-hint">
            ▸ {game.hint(boardLevel, t)}
          </span>
        )}
        <Button variant="secondary" className="details-link mobile-only" onClick={() => setAiDetailsOpen(true)}>
          {t("AI 详情")}
        </Button>
      </>
    );

  return (
    <GameStage
      phase={phase.kind}
      topBar={<GameTopBar crumb={crumb} exitPath={game.exitPath} />}
      hud={<GameHud
          level={displayLevel}
          chances={session?.lives ?? game.startingChances}
          remainingMs={remaining}
          limitMs={limit}
          totalLevels={game.totalLevels}
          startingChances={game.startingChances}
          badge={<StreakCounter combo={streak.combo} streak={streak.streak} />}
        />}
      lane={<AiDanmakuLane messages={danmakuMessages} paused={aiDetailsOpen} />}
      board={board}
      overlay={
        phase.kind === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            <span key={phase.value} className={typeof phase.value === "string" ? "fx-fight" : undefined}>
              {phase.value}
            </span>
          </div>
        ) : null
      }
      foot={foot}
      side={
        <>
          <div className="vs-card" data-testid="vs-status">
            <div className="vs-row">
              <Badge variant="human">{t("你")}</Badge>
              <span className="vs-state">{humanNow}</span>
            </div>
            <div className="vs-row">
              <Badge variant="ai">AI</Badge>
              <span className="vs-state" data-testid="ai-status">{aiNowLabel}</span>
            </div>
          </div>
          <AiTerminal title={t("AI 终端 · {model}", { model: "Luna" })} steps={terminalSteps} live footer={t("真实调用 · 真实速度 · 揭晓前不显示答案")} />
        </>
      }
      extra={
        <DetailsSheet open={aiDetailsOpen} title={t("AI 活动")} onClose={() => setAiDetailsOpen(false)}>
          <AiActivityPanel snapshot={{ steps: terminalSteps, capturedAt: 0 }} />
        </DetailsSheet>
      }
    />
  );
}
