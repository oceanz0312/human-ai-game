"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicLevel, RoundReveal, SessionSnapshot } from "@/game/contracts";
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";
import { api, ApiError, haptic, track, withRetry } from "@/lib/api-client";
import { countdown } from "@/lib/format";
import { GameBoard } from "./GameBoard";
import { GameHeader } from "./GameHeader";
import { LevelReveal } from "./LevelReveal";

export const AUTO_ADVANCE_MS = 1500;
const SLOW_LOADING_MS = 800;
const AI_POLL_MS = 500;
const AI_POLL_LIMIT_MS = 15_000;

type Phase =
  | { kind: "loading" }
  | { kind: "countdown"; value: number }
  | { kind: "playing" }
  | { kind: "submitting" }
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

export function GameScreen({ sessionId, autoAdvanceMs = AUTO_ADVANCE_MS }: { sessionId: string; autoAdvanceMs?: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [level, setLevel] = useState<PublicLevel | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [painted, setPainted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RoundReveal | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [slowEpoch, setSlowEpoch] = useState(-1);

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
      else router.push("/");
    },
    [router],
  );

  const showReveal = useCallback(
    (round: RoundReveal, next: SessionSnapshot, previousLives: number | null) => {
      setReveal(round);
      setSession(next);
      if (previousLives !== null && next.lives < previousLives) haptic();
      setSecondsLeft(Math.ceil(autoAdvanceMs / 1000));
      advancingRef.current = false;
      setPhase({ kind: "reveal" });
    },
    [autoAdvanceMs],
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
          if (error instanceof ApiError && error.code === "round_not_started") beginRef.current = api.beginRound(roundId);
          throw error;
        }
      }).then((response) => {
        if (!mountedRef.current) return;
        track("player_answered", { sessionId, level: response.round.level, metadata: { status: response.round.human?.status ?? null } });
        pendingSubmitRef.current = null;
        showReveal(response.round, response.session, livesRef.current);
      });
    } catch {
      if (mountedRef.current) setPhase({ kind: "error", message: "网络不稳定，答案已锁定，请重试提交。", action: "resubmit" });
    }
  }, [sessionId, showReveal]);

  const lockAnswer = useCallback(
    (choice: string | null) => {
      if (lockedRef.current || startedAtRef.current === null || !level) return;
      lockedRef.current = true;
      setLocked(true);
      const elapsedMs = choice === null ? level.limitMs : Math.round(performance.now() - startedAtRef.current);
      setSelected(choice);
      if (choice === null) setRemainingMs(0);
      haptic();
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
    setSecondsLeft(null);
    setLocked(false);
    setLoadEpoch((value) => value + 1);
    lockedRef.current = false;
    startedAtRef.current = null;
    beginRef.current = null;
    try {
      const response = await withRetry(() => api.startNextRound(sessionId), 3);
      if (!mountedRef.current) return;
      roundIdRef.current = response.round.id;
      setSession(response.session);
      setLevel(response.level);
      setRemainingMs(response.level.limitMs);

      const preload = preloadImage(response.level.imageUrl);
      if (response.level.level === 1 && !countdownShownRef.current) {
        countdownShownRef.current = true;
        for (const value of [3, 2, 1]) {
          if (!mountedRef.current) return;
          setPhase({ kind: "countdown", value });
          await sleep(1000);
        }
      }
      await preload;
      if (!mountedRef.current) return;
      const next = PUBLIC_LEVELS_V1[response.level.level];
      if (next) void preloadImage(next.imageUrl).catch(() => undefined);
      setImageReady(true);
      setPhase({ kind: "playing" });
    } catch (error) {
      if (!mountedRef.current) return;
      if (error instanceof ApiError && error.code === "session_ended") {
        goToResult(await api.getSession(sessionId));
        return;
      }
      if (error instanceof ApiError && error.code === "round_in_progress") {
        void bootRef.current();
        return;
      }
      setPhase({ kind: "error", message: error instanceof ApiError && error.status === 404 ? "找不到这局挑战。" : "关卡加载失败，生命不会减少。", action: "reload" });
    }
  }, [sessionId, goToResult]);

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
      setPhase({ kind: "error", message: error instanceof ApiError && error.status === 404 ? "找不到这局挑战。" : "网络不稳定，请重试。", action: "reload" });
    }
  }, [sessionId, goToResult, loadNextRound, sendSubmission]);

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
    beginRef.current = withRetry(() => api.beginRound(roundId), 3);
  }, []);

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
    if (session.status === "ended") goToResult(session);
    else void loadNextRound();
  }, [session, goToResult, loadNextRound]);

  // Auto-advance after the reveal, with a visible countdown.
  useEffect(() => {
    if (phase.kind !== "reveal") return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const left = autoAdvanceMs - (performance.now() - startedAt);
      if (left <= 0) {
        window.clearInterval(interval);
        advance();
      } else {
        setSecondsLeft(Math.ceil(left / 1000));
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase.kind, autoAdvanceMs, advance]);

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

  if (phase.kind === "reveal" && reveal && session) {
    return <LevelReveal round={reveal} fasterThanAiCount={session.fasterThanAiCount} ended={session.status === "ended"} secondsLeft={secondsLeft} onNext={advance} />;
  }

  if (phase.kind === "countdown") {
    return (
      <main className="mobile-shell game">
        <GameHeader level={1} lives={session?.lives ?? 3} />
        <div className="countdown-overlay" aria-live="assertive">
          <span key={phase.value}>{phase.value}</span>
        </div>
      </main>
    );
  }

  if (phase.kind === "error") {
    return (
      <main className="mobile-shell game">
        <GameHeader level={level?.level ?? session?.level ?? 1} lives={session?.lives ?? 3} />
        <div className="reveal-body">
          <p className="inline-error">{phase.message}</p>
        </div>
        <div className="bottom-actions">
          <button
            type="button"
            className="primary-action"
            onClick={() => {
              if (phase.action === "resubmit") void sendSubmission();
              else void boot();
            }}
          >
            {phase.action === "resubmit" ? "重试提交" : "重新加载关卡"}
          </button>
          <button type="button" className="text-action" onClick={() => router.push("/")}>
            返回首页
          </button>
        </div>
      </main>
    );
  }

  const displayLevel = level?.level ?? session?.level ?? 1;
  const limit = level?.limitMs ?? PUBLIC_LEVELS_V1[displayLevel - 1]?.limitMs ?? 0;
  const remaining = remainingMs ?? limit;
  const interactive = phase.kind === "playing" && painted && !locked;
  const slowLoading = phase.kind === "loading" && slowEpoch === loadEpoch;

  return (
    <main className="mobile-shell game">
      <GameHeader level={displayLevel} lives={session?.lives ?? 3} />
      <div className={remaining < 1000 ? "timer urgent" : "timer"} aria-live="off">
        <div className="value" data-testid="timer">
          {countdown(remaining)}
        </div>
        <div className="unit">秒</div>
      </div>
      <GameBoard
        gridSize={level?.gridSize ?? PUBLIC_LEVELS_V1[displayLevel - 1]?.gridSize ?? 3}
        imageUrl={imageReady && level ? level.imageUrl : null}
        disabled={!interactive}
        selected={selected}
        loadingLabel={slowLoading ? "正在加载关卡" : null}
        onChoose={lockAnswer}
        onImagePainted={onImagePainted}
      />
      <div className="game-spacer" />
      <footer className="ai-status">
        <span className="ai">
          <span className="ai-dot" aria-hidden />
          AI 正在寻找
        </span>
        <span className="hint">{phase.kind === "submitting" ? "已锁定" : "点击不同项"}</span>
      </footer>
    </main>
  );
}
