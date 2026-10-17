"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicLevel, RoundReveal, SessionSnapshot } from "@/game/contracts";
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";
import { buildAiActivitySteps, snapshotAiActivity, type AiActivitySnapshot } from "@/game/ai-activity";
import { STARTING_LIVES } from "@/game/contracts";
import { dispatchRoundAi, type AiNetworkProgress } from "@/lib/ai-dispatch";
import { AiActivityPanel } from "./AiActivityPanel";
import { AiDanmakuLane } from "./AiDanmakuLane";
import { DetailsSheet } from "./DetailsSheet";
import { danmakuFromActivitySteps } from "@/game/danmaku-messages";
import { api, ApiError, haptic, track, withRetry } from "@/lib/api-client";
import { pad2 } from "@/lib/format";
import { GameBoard } from "./GameBoard";
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

export function GameScreen({ sessionId }: { sessionId: string }) {
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
  const [aiProgress, setAiProgress] = useState<AiNetworkProgress | null>(null);
  const [aiActivitySnapshot, setAiActivitySnapshot] = useState<AiActivitySnapshot | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [slowEpoch, setSlowEpoch] = useState(-1);
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);

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
  const aiProgressRef = useRef<AiNetworkProgress | null>(null);

  const syncAiActivity = useCallback((progress: AiNetworkProgress | null, submitting = false) => {
    aiProgressRef.current = progress;
    setAiProgress(progress);
    setAiActivitySnapshot(snapshotAiActivity(progress, submitting, locale));
  }, [locale]);

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
      setReveal(round);
      setSession(next);
      if (previousLives !== null && next.lives < previousLives) haptic();
      advancingRef.current = false;
      setPhase({ kind: "reveal" });
    },
    [],
  );

  const sendSubmission = useCallback(async () => {
    const roundId = roundIdRef.current;
    const submission = pendingSubmitRef.current;
    if (!roundId || !submission) return;
    setPhase({ kind: "submitting" });
    syncAiActivity(aiProgressRef.current, true);
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
      if (mountedRef.current) setPhase({ kind: "error", message: t("网络不稳定，答案已锁定，请重试提交。"), action: "resubmit" });
    }
  }, [sessionId, showReveal, syncAiActivity, t]);

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
    setAiProgress(null);
    setAiActivitySnapshot(null);
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
  }, [sessionId, goToResult, t]);

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
    beginRef.current = withRetry(async () => {
      const begun = await api.beginRound(roundId);
      if (begun.ai) {
        const ticketIssuedAt = begun.ai.mode === "worker" ? begun.ai.issuedAt : Date.now();
        syncAiActivity({
          ticketIssuedAt,
          requestSentAt: null,
          responseReceivedAt: null,
          requestId: null,
          errorCode: null,
          modelElapsedMs: null,
          totalElapsedMs: null,
          imageLoadMs: null,
        });
        try {
          const outcome = await dispatchRoundAi(begun.ai, {
            onProgress: (progress) => syncAiActivity(progress),
          });
          syncAiActivity(outcome.progress);
          track("ai_dispatch_complete", {
            sessionId,
            level: level?.level ?? null,
            metadata: { requestId: outcome.progress.requestId, errorCode: outcome.progress.errorCode },
          });
        } catch {
          track("ai_dispatch_failed", { sessionId, level: level?.level ?? null });
        }
      }
      return begun;
    }, 3);
  }, [sessionId, level, syncAiActivity]);

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
  const limit = level?.limitMs ?? PUBLIC_LEVELS_V1[displayLevel - 1]?.limitMs ?? 0;
  const gridSize = level?.gridSize ?? PUBLIC_LEVELS_V1[displayLevel - 1]?.gridSize ?? 3;
  const crumb = `${t("大家来找茬")} / ${t("第 {n} 关", { n: pad2(displayLevel) })}`;

  if (phase.kind === "reveal" && reveal && session) {
    return (
      <LevelReveal
        round={reveal}
        fasterThanAiCount={session.fasterThanAiCount}
        ended={session.status === "ended"}
        onNext={advance}
        browserAiActivity={aiActivitySnapshot}
        topBar={<GameTopBar crumb={`${t("大家来找茬")} / ${t("第 {n} 关", { n: pad2(reveal.level) })}`} />}
      />
    );
  }

  const remaining = remainingMs ?? limit;
  const interactive = phase.kind === "playing" && painted && !locked;
  const slowLoading = phase.kind === "loading" && slowEpoch === loadEpoch;
  const activitySteps = aiActivitySnapshot?.steps ?? [];
  const danmakuMessages = danmakuFromActivitySteps(activitySteps, true, locale);
  const terminalSteps = aiActivitySnapshot?.steps ?? buildAiActivitySteps(aiProgress, phase.kind === "submitting", locale);
  const aiNow = [...terminalSteps].reverse().find((step) => step.state === "active") ?? terminalSteps[terminalSteps.length - 1];
  const humanNow = locked || phase.kind === "submitting" ? t("答案已锁定") : interactive ? t("作答中…") : t("准备中");

  const board =
    phase.kind === "error" ? (
      <div className="board board-message" data-testid="board">
        <p className="inline-error">{phase.message}</p>
      </div>
    ) : (
      <GameBoard
        gridSize={gridSize}
        imageUrl={imageReady && level ? level.imageUrl : null}
        disabled={!interactive}
        selected={selected}
        loadingLabel={slowLoading ? t("正在加载关卡") : null}
        onChoose={lockAnswer}
        onImagePainted={onImagePainted}
      />
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
        <Button variant="text" onClick={() => router.push(localePath(locale, "/spot-the-difference"))}>
          {t("返回首页")}
        </Button>
      </div>
    ) : (
      <>
        <span className="game-hint">
          ▸ {t("点击不同项")} · {gridSize}×{gridSize}
        </span>
        <Button variant="secondary" className="details-link mobile-only" onClick={() => setAiDetailsOpen(true)}>
          {t("AI 详情")}
        </Button>
      </>
    );

  return (
    <GameStage
      phase={phase.kind}
      topBar={<GameTopBar crumb={crumb} />}
      hud={<GameHud level={displayLevel} chances={session?.lives ?? STARTING_LIVES} remainingMs={remaining} limitMs={limit} />}
      lane={<AiDanmakuLane messages={danmakuMessages} paused={aiDetailsOpen} />}
      board={board}
      overlay={
        phase.kind === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            <span key={phase.value}>{phase.value}</span>
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
              <span className="vs-state">{aiNow?.label ?? t("准备 AI 请求")}</span>
            </div>
          </div>
          <AiTerminal title={t("AI 终端 · {model}", { model: "gpt-6-luna" })} steps={terminalSteps} live footer={t("真实调用 · 真实速度 · 对局中不显示答案")} />
        </>
      }
      extra={
        <DetailsSheet open={aiDetailsOpen} title={t("AI 活动")} onClose={() => setAiDetailsOpen(false)}>
          <AiActivityPanel progress={aiProgress} submitting={phase.kind === "submitting"} snapshot={aiActivitySnapshot} />
        </DetailsSheet>
      }
    />
  );
}
