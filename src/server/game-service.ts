import type { AiDispatch, AiEvent, BeginRoundResponse, LeaderboardRow, ResultView, RoundReveal, RoundStartResponse, SessionSnapshot, SubmitResponse } from "../game/contracts";
import { parseStoredProbabilities } from "../game/ai-insights";
import { advanceSession, reconcileElapsed, resolveHumanAnswer, resolveRace } from "../game/rules";
import type { DecisionClient, DecisionResult, WorkerDecisionResponse } from "./decisions/contracts";
import { signDecisionTicket, ticketExpiresAt } from "./decisions/ticket";
import { GameError } from "./errors";
import type { AnyGamePlugin, CoreLevel } from "../core/game-plugin";
import { nextUtcMidnight, PLAY_LIMIT_DEFAULTS, scopeKey, utcDay, type PlayLimitConfig, type PlayLimitStatus } from "../core/limits/config";
import { decisionClientForModel } from "../models/adapters";
import { createSimulatedDecisionClient } from "../models/adapters/simulated";
import { getModel, resolveModelId } from "../models/registry";
import type { GameRepository, LeaderboardRepository, RoundRow, SessionRow } from "./repositories/game-repository";
import type { ServerTiming } from "./server-timing";

export interface GameServiceDeps {
  games: GameRepository;
  leaderboard: LeaderboardRepository;
  decisions: DecisionClient;
  /** AI_MODE=simulated (production default): the opponent is the in-game simulated AI, no model calls. */
  simulateAi?: boolean;
  now: () => number;
  randomId: () => string;
  randomPublicId: () => string;
  /** The game being played: levels, judging, AI task. The service itself is game-agnostic. */
  game: AnyGamePlugin;
  /** Legacy browser-ticket dispatch only: content hash the Decisions Worker verifies. */
  legacyLevelAssetSha256?: (level: number) => string;
  sleep?: (ms: number) => Promise<void>;
  /** How long a submission waits for a still-running AI before revealing "AI 仍在判断". */
  aiRevealWaitMs?: number;
  /** Abort budget for one Worker call. */
  aiTimeoutMs?: number;
  maxSessionsPerHour?: number;
  /** Public Decisions Worker URL the browser calls (never the OpenAI key). */
  decisionsWorkerPublicUrl?: string | null;
  /** HMAC secret shared with the Decisions Worker for tickets and internal callbacks. */
  decisionsTicketSecret?: string | null;
  /**
   * server (default): the game service calls the AI itself the moment the round is shown and streams real progress.
   * worker / fake: legacy browser-initiated dispatch (rollback switch). off: AI stays offline.
   */
  decisionsDispatchMode?: "server" | "worker" | "fake" | "off";
  /** Game↔model compatibility. Default: the model registry (`ModelEntry.games`). */
  modelPlaysGame?: (modelId: string, game: string) => boolean;
  /** Daily play limit (runs per person per UTC day). Default 3 per game; runsPerDay 0 disables. */
  playLimit?: PlayLimitConfig;
  /** Keeps non-critical work (analytics rows) alive after the response. Default: awaited inline (tests). */
  defer?: (work: Promise<unknown>) => void;
}

/** A live AI run for one round: real events in order, replayed to late subscribers. */
export interface AiRun {
  events: AiEvent[];
  subscribe(listener: (event: AiEvent) => void): () => void;
  done: Promise<void>;
}

const isFinalEvent = (event: AiEvent) => event.event === "answered" || event.event === "error";

function createAiRun(work: (emit: (event: AiEvent) => void) => Promise<void>): AiRun {
  const events: AiEvent[] = [];
  const listeners = new Set<(event: AiEvent) => void>();
  const emit = (event: AiEvent) => {
    events.push(event);
    for (const listener of [...listeners]) listener(event);
  };
  const done = work(emit).catch(() => {
    if (!events.some(isFinalEvent)) emit({ event: "error", at: Date.now(), code: "network_error" });
  });
  return {
    events,
    subscribe(listener) {
      for (const event of [...events]) listener(event);
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    done,
  };
}

export function createGameService(deps: GameServiceDeps) {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const aiRevealWaitMs = deps.aiRevealWaitMs ?? 0;
  const aiTimeoutMs = deps.aiTimeoutMs ?? 10_000;
  const aiStaleMs = aiTimeoutMs + 5_000;
  const maxSessionsPerHour = deps.maxSessionsPerHour ?? 40;
  const game = deps.game;
  /** Analytics writes off the player's critical path when a defer hook exists; inline otherwise. */
  const trackLater = async (...args: Parameters<typeof track>) => {
    const work = track(...args);
    if (deps.defer) deps.defer(work);
    else await work;
  };

  async function track(name: string, input: { playerId?: string | null; sessionId?: string | null; level?: number | null; metadata?: Record<string, unknown> }) {
    try {
      await deps.games.insertEvent({
        name,
        source: "server",
        playerId: input.playerId ?? null,
        sessionId: input.sessionId ?? null,
        level: input.level ?? null,
        serverTs: deps.now(),
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });
    } catch {
      // Analytics must never break gameplay.
    }
  }

  async function loadOwnedSession(sessionId: string, playerId: string): Promise<SessionRow> {
    const session = await deps.games.getOwnedSession(sessionId, playerId);
    if (!session) throw new GameError("not_found");
    return session;
  }

  function toSessionSnapshot(session: SessionRow, open: RoundRow | null): SessionSnapshot {
    return {
      id: session.id,
      level: session.level,
      lives: session.lives,
      fasterThanAiCount: session.fasterThanAiCount,
      status: session.status,
      reachedLevel: session.reachedLevel,
      cleared: session.cleared,
      modelId: session.modelId,
      publicId: null,
      activeRound: open ? { id: open.id, level: open.level, shown: open.shownAt !== null } : null,
    };
  }

  async function loadOwnedRound(roundId: string, playerId: string) {
    const round = await deps.games.getRound(roundId);
    if (!round) throw new GameError("not_found");
    const session = await loadOwnedSession(round.sessionId, playerId);
    return { round, session };
  }

  async function sessionSnapshot(session: SessionRow): Promise<SessionSnapshot> {
    const [open, result] = await Promise.all([
      session.status === "active" ? deps.games.getOpenRound(session.id) : Promise.resolve(null),
      session.status === "ended" ? deps.games.getResultBySession(session.id) : Promise.resolve(null),
    ]);
    return { ...toSessionSnapshot(session, open), publicId: result?.publicId ?? null };
  }

  async function refreshSession(sessionId: string) {
    const session = await deps.games.getSession(sessionId);
    if (!session) throw new GameError("not_found");
    return sessionSnapshot(session);
  }

  function aiRevealFields(round: RoundRow) {
    const complete = round.aiStatus === "complete";
    return {
      status: round.aiStatus,
      correct: complete ? round.aiCorrect : null,
      elapsedMs: complete ? round.aiElapsedMs : null,
      refused: round.aiStatus === "error" && round.aiErrorCode === "refused",
      choice: complete ? round.aiChoice : null,
      confidence: complete ? round.aiConfidence : null,
      probabilities: complete ? parseStoredProbabilities(round.aiProbabilities) : null,
      modelElapsedMs: complete ? round.aiModelElapsedMs : null,
      errorCode: round.aiStatus === "error" ? round.aiErrorCode : null,
      errorDetail: round.aiStatus === "error" ? round.aiErrorDetail : null,
    };
  }

  function toReveal(round: RoundRow): RoundReveal {
    const level = game.getLevel(round.level);
    const human = round.humanStatus ? { status: round.humanStatus, choice: round.humanChoice, elapsedMs: round.humanElapsedMs ?? 0 } : null;
    const aiFinal = round.aiStatus === "complete" || round.aiStatus === "error";
    const winner =
      round.winner ??
      (human && aiFinal
        ? resolveRace({ humanCorrect: human.status === "correct", humanElapsedMs: human.elapsedMs, aiStatus: round.aiStatus, aiCorrect: round.aiCorrect, aiElapsedMs: round.aiElapsedMs }).winner
        : "pending");
    const lockedIn = Boolean(human);
    return {
      id: round.id,
      level: round.level,
      ...(game.revealFields(level) as { gridSize: RoundReveal["gridSize"]; imageUrl: string }),
      correctChoice: lockedIn ? game.correctAnswer(level) : null,
      human,
      // The AI outcome stays hidden until the player has locked in an answer.
      ai: lockedIn
        ? aiRevealFields(round)
        : {
            status: round.aiStatus === "pending" ? "pending" : "running",
            correct: null,
            elapsedMs: null,
            refused: false,
            choice: null,
            confidence: null,
            probabilities: null,
            modelElapsedMs: null,
            errorCode: null,
            errorDetail: null,
          },
      winner: human ? winner : "pending",
      fasterThanAi: round.fasterThanAi,
    };
  }

  async function expireIfStale(round: RoundRow) {
    if (round.aiStatus === "running" && round.aiStartedAt !== null && deps.now() - round.aiStartedAt > aiStaleMs) {
      await deps.games.expireStaleAi(round.id, deps.now() - aiStaleMs, deps.now());
      return (await deps.games.getRound(round.id)) ?? round;
    }
    return round;
  }

  async function persistAiAnswer(round: RoundRow, answer: DecisionResult | WorkerDecisionResponse, wallElapsedMs?: number) {
    const level = game.getLevel(round.level);
    const complete = answer.status === "complete" && answer.choice !== null && game.isValidAnswer(level, answer.choice);
    const elapsedMs = complete ? (wallElapsedMs ?? ("elapsedMs" in answer ? answer.elapsedMs : null) ?? answer.modelElapsedMs) : null;
    await deps.games.saveAiAnswer(
      round.id,
      {
        status: complete ? "complete" : "error",
        choice: complete ? answer.choice : null,
        correct: complete && answer.choice !== null ? game.judge(level, answer.choice) : null,
        elapsedMs: complete ? elapsedMs : null,
        modelElapsedMs: answer.modelElapsedMs,
        confidence: complete ? answer.confidence : null,
        probabilities: complete ? answer.probabilities : {},
        errorCode: complete ? null : (answer.errorCode ?? "invalid_choice"),
        errorDetail: complete ? null : ("detail" in answer ? (answer.detail ?? null) : null),
        requestId: answer.requestId,
      },
      deps.now(),
    );
    await track("ai_answered", {
      sessionId: round.sessionId,
      level: round.level,
      metadata: {
        status: complete ? "complete" : "error",
        correct: complete && answer.choice !== null ? game.judge(level, answer.choice) : null,
        elapsedMs,
        modelElapsedMs: answer.modelElapsedMs,
        errorCode: answer.errorCode,
      },
    });
  }

  async function buildAiDispatch(round: RoundRow, level: CoreLevel): Promise<AiDispatch | null> {
    const mode = deps.decisionsDispatchMode ?? "off";
    if (mode === "fake") return { mode: "fake", url: `/api/rounds/${round.id}/ai-fake` };
    if (mode !== "worker" || !deps.decisionsWorkerPublicUrl || !deps.decisionsTicketSecret) return null;
    if (!deps.legacyLevelAssetSha256) return null;
    const imageSha256 = deps.legacyLevelAssetSha256(round.level);
    const now = deps.now();
    const ticket = await signDecisionTicket(
      {
        v: 1,
        jti: deps.randomId(),
        roundId: round.id,
        sessionId: round.sessionId,
        level: round.level,
        imageSha256,
        choices: game.choices(level),
        exp: ticketExpiresAt(now, level.limitMs),
        iat: now,
      },
      deps.decisionsTicketSecret,
    );
    return { mode: "worker", url: new URL("/v1/decide-ticket", deps.decisionsWorkerPublicUrl).toString(), ticket, issuedAt: now };
  }

  /** Runs the AI for a freshly shown round. The AI clock starts at the same server instant as the human's (shownAt). */
  async function runServerAi(round: RoundRow, level: CoreLevel, emit: (event: AiEvent) => void, modelId: string) {
    // Only live models reach a real client; anything else gets a scaffold that never calls out.
    const decisions = deps.simulateAi
      ? createSimulatedDecisionClient({ level: level.level, totalLevels: game.totalLevels, limitMs: level.limitMs, correctChoice: game.correctAnswer(level), seed: round.id })
      : decisionClientForModel(modelId, deps.decisions);
    const shownAt = round.shownAt ?? deps.now();
    let answer: DecisionResult;
    try {
      const input = await game.buildDecisionInput(level);
      emit({ event: "image", at: deps.now() });
      const budgetMs = Math.max(1, level.limitMs - (deps.now() - shownAt));
      emit({ event: "sent", at: deps.now() });
      answer = await decisions.decide(input, AbortSignal.timeout(Math.min(budgetMs, aiTimeoutMs)));
    } catch {
      answer = { status: "error", choice: null, confidence: null, probabilities: {}, modelElapsedMs: 0, errorCode: "network_error", requestId: "none", elapsedMs: 0 };
    }
    const completedAt = deps.now();
    const elapsedMs = Math.max(0, completedAt - shownAt);
    // The AI has the same time limit as the player; a late answer is a timeout, never a win.
    if (elapsedMs > level.limitMs || (answer.status === "error" && answer.errorCode === "upstream_timeout")) {
      answer = { ...answer, status: "error", choice: null, confidence: null, probabilities: {}, errorCode: "ai_timeout", elapsedMs };
    }
    await persistAiAnswer(round, answer, elapsedMs);
    const complete = answer.status === "complete" && answer.choice !== null && game.isValidAnswer(level, answer.choice);
    emit(complete ? { event: "answered", at: completedAt } : { event: "error", at: completedAt, code: answer.errorCode ?? "invalid_choice" });
  }

  /** A second /start for a round whose AI already runs elsewhere: report only the final outcome, from D1. */
  async function watchAi(roundId: string, level: CoreLevel, emit: (event: AiEvent) => void) {
    const giveUpAt = deps.now() + level.limitMs + 5_000;
    for (;;) {
      let round = await deps.games.getRound(roundId);
      if (!round) return;
      round = await expireIfStale(round);
      if (round.aiStatus === "complete") return emit({ event: "answered", at: round.aiCompletedAt ?? deps.now() });
      if (round.aiStatus === "error") return emit({ event: "error", at: round.aiCompletedAt ?? deps.now(), code: round.aiErrorCode });
      if (deps.now() > giveUpAt) return emit({ event: "error", at: deps.now(), code: "ai_timeout" });
      await sleep(250);
    }
  }

  async function beginRoundCore(roundId: string, playerId: string): Promise<{ begun: BeginRoundResponse; run: AiRun | null }> {
    const { round, session } = await loadOwnedRound(roundId, playerId);
    if (round.humanStatus) return { begun: { roundId: round.id, deadlineAt: round.deadlineAt, started: false, ai: null }, run: null };
    const level = game.getLevel(round.level);
    const firstPaint = round.shownAt === null;
    const marked = await deps.games.markShown(round.id, deps.now(), level.limitMs);
    const mode = deps.decisionsDispatchMode ?? "server";
    if (mode === "server") {
      const begun = { roundId: marked.id, deadlineAt: marked.deadlineAt, started: firstPaint, ai: null };
      // The AI starts before any bookkeeping so its clock and the player's begin at the same shownAt.
      const run =
        firstPaint && (await deps.games.claimAiRun(roundId, deps.now(), session.modelId))
          ? createAiRun((emit) => runServerAi(marked, level, emit, session.modelId))
          : createAiRun((emit) => watchAi(roundId, level, emit));
      await trackLater("level_shown", { playerId, sessionId: round.sessionId, level: round.level });
      return { begun, run };
    }
    await track("level_shown", { playerId, sessionId: round.sessionId, level: round.level });
    let ai: AiDispatch | null = null;
    if (firstPaint) {
      ai = await buildAiDispatch(marked, level);
      if (ai?.mode === "worker") {
        await deps.games.claimAiRun(roundId, deps.now());
      } else if (!ai && (await deps.games.claimAiRun(roundId, deps.now()))) {
        await persistAiAnswer(marked, {
          status: "error",
          choice: null,
          confidence: null,
          probabilities: {},
          modelElapsedMs: 0,
          errorCode: "ai_unconfigured",
          requestId: "none",
        });
      }
    }
    return { begun: { roundId: marked.id, deadlineAt: marked.deadlineAt, started: firstPaint, ai }, run: null };
  }

  async function resultWithOwner(publicId: string): Promise<{ view: ResultView; ownerId: string } | null> {
    const toOutcome = (round: { aiStatus: string | null; winner: string | null }) =>
      (round.aiStatus === "error" ? "void" : (round.winner ?? "none")) as "human" | "ai" | "none" | "void";
    if (process.env.RESULT_BUNDLE !== "off") {
      const bundle = await deps.games.getResultBundle(publicId);
      if (!bundle) return null;
      return {
        ownerId: bundle.result.playerId,
        view: {
          played: bundle.accuracy.played,
          humanCorrect: bundle.accuracy.humanCorrect,
          aiCorrect: bundle.accuracy.aiCorrect,
          publicId: bundle.result.publicId,
          nickname: bundle.nickname,
          reachedLevel: bundle.result.reachedLevel,
          fasterThanAiCount: bundle.session.fasterThanAiCount,
          cleared: bundle.result.cleared,
          outcomes: bundle.outcomes.map(toOutcome),
          rank: bundle.rank,
          bestLevel: bundle.bestLevel,
          endedAt: bundle.result.createdAt,
        },
      };
    }
    const row = await deps.games.getResultByPublicId(publicId);
    if (!row) return null;
    const best = await deps.leaderboard.getBest(row.result.playerId, row.result.levelSetVersion);
    const bestLevel = best?.bestLevel ?? row.result.reachedLevel;
    const [accuracy, settled] = await Promise.all([deps.games.sessionAccuracy(row.session.id), deps.games.sessionOutcomes?.(row.session.id) ?? []]);
    return {
      ownerId: row.result.playerId,
      view: {
        played: accuracy.played,
        humanCorrect: accuracy.humanCorrect,
        aiCorrect: accuracy.aiCorrect,
        publicId: row.result.publicId,
        nickname: row.nickname,
        reachedLevel: row.result.reachedLevel,
        fasterThanAiCount: row.session.fasterThanAiCount,
        cleared: row.result.cleared,
        outcomes: settled.map(toOutcome),
        rank: await deps.leaderboard.getRankForLevel(bestLevel, row.result.levelSetVersion),
        bestLevel,
        endedAt: row.result.createdAt,
      },
    };
  }

  return {
    /** Marks the round shown and, in server mode, starts the AI at that same instant; returns a live event run. */
    beginRoundLive: beginRoundCore,

    async ensurePlayer(playerId: string | null) {
      const id = playerId ?? deps.randomId();
      const existing = playerId ? await deps.games.getPlayer(playerId) : null;
      return existing ?? (await deps.games.createPlayer(id, deps.now()));
    },

    async setNickname(playerId: string, nickname: string) {
      await deps.games.setNickname(playerId, nickname);
    },

    async createSession(input: {
      playerId: string;
      nickname?: string;
      replay?: boolean;
      /** Requested opponent; resolved to a live model that plays this game. */
      modelId?: string | null;
      /** Hashed person key for the daily limit; omitted = not enforced (internal callers, tests). */
      limitKey?: string | null;
      bypassLimit?: boolean;
    }): Promise<SessionSnapshot & { playLimit?: PlayLimitStatus }> {
      const recent = await deps.games.countSessionsSince(input.playerId, deps.now() - 60 * 60 * 1000);
      if (recent >= maxSessionsPerHour) throw new GameError("too_many_requests");
      const modelId = resolveModelId(input.modelId);
      const plays = deps.modelPlaysGame ?? ((id: string, slug: string) => Boolean(getModel(id)?.games.includes(slug)));
      if (!plays(modelId, game.slug)) throw new GameError("invalid_request");

      const now = deps.now();
      const config = deps.playLimit ?? PLAY_LIMIT_DEFAULTS;
      const enforce = Boolean(input.limitKey) && !input.bypassLimit && config.runsPerDay > 0;
      const slot = { key: input.limitKey ?? "", day: utcDay(now), scope: scopeKey(config, game.slug) };
      let used: number | null = null;
      if (enforce) {
        used = await deps.games.consumeDailyPlay({ ...slot, limit: config.runsPerDay, now });
        if (used === null) throw new GameError("daily_limit");
      }
      let session;
      try {
        if (input.nickname) await deps.games.setNickname(input.playerId, input.nickname);
        session = await deps.games.createSession({
          id: deps.randomId(),
          playerId: input.playerId,
          now,
          levelSetVersion: game.levelSetVersion,
          startingChances: game.startingChances,
          gameId: game.slug,
          modelId,
        });
      } catch (error) {
        if (enforce) await deps.games.refundDailyPlay(slot).catch(() => undefined);
        throw error;
      }
      await trackLater(input.replay ? "replay" : "game_start", { playerId: input.playerId, sessionId: session.id, level: 1, metadata: { modelId } });
      const snapshot = await sessionSnapshot(session);
      if (!input.limitKey || config.runsPerDay <= 0) return snapshot;
      const count = used ?? (await deps.games.countDailyPlays(slot));
      return {
        ...snapshot,
        playLimit: {
          limit: config.runsPerDay,
          used: count,
          remaining: Math.max(0, config.runsPerDay - count),
          resetAt: nextUtcMidnight(now),
          ...(input.bypassLimit ? { bypass: true } : {}),
        },
      };
    },

    /** Opponent-select stats for one model on this game's level set. */
    async getModelStats(modelId: string) {
      return deps.leaderboard.modelStats({ version: game.levelSetVersion, modelId });
    },

    /** Leaderboard for one opponent model (per-model board). */
    async getModelLeaderboard(modelId: string, limit = 10) {
      const rows = await deps.leaderboard.listByModel({ version: game.levelSetVersion, modelId, limit });
      return rows.map((row) => ({ rank: row.rank, nickname: row.nickname ?? `玩家 ${row.playerId.slice(0, 4).toUpperCase()}`, reachedLevel: row.reachedLevel, isMe: false }));
    },

    /** Remaining plays today for a hashed person key. */
    async getPlayLimit(input: { limitKey: string; bypassLimit?: boolean }): Promise<PlayLimitStatus> {
      const now = deps.now();
      const config = deps.playLimit ?? PLAY_LIMIT_DEFAULTS;
      const used = config.runsPerDay > 0 ? await deps.games.countDailyPlays({ key: input.limitKey, day: utcDay(now), scope: scopeKey(config, game.slug) }) : 0;
      return {
        limit: config.runsPerDay,
        used,
        remaining: input.bypassLimit ? config.runsPerDay : Math.max(0, config.runsPerDay - used),
        resetAt: nextUtcMidnight(now),
        ...(input.bypassLimit ? { bypass: true } : {}),
      };
    },

    async getSession(sessionId: string, playerId: string) {
      return sessionSnapshot(await loadOwnedSession(sessionId, playerId));
    },

    async startNextRound(sessionId: string, playerId: string, timing?: ServerTiming): Promise<RoundStartResponse> {
      const d1Start = performance.now();
      const [session, open] = await Promise.all([deps.games.getOwnedSession(sessionId, playerId), deps.games.getOpenRound(sessionId)]);
      timing?.mark("d1", d1Start, "owned-session-and-open-round");
      if (!session) throw new GameError("not_found");
      if (session.status !== "active") throw new GameError("session_ended");
      if (open && open.shownAt !== null) throw new GameError("round_in_progress");

      let round = open;
      if (!round) {
        const createStart = performance.now();
        round = await deps.games.createRound({ id: deps.randomId(), sessionId: session.id, level: session.level, now: deps.now() });
        timing?.mark("d1-create", createStart, "insert-round");
      }

      const assembleStart = performance.now();
      const response: RoundStartResponse = {
        round: { id: round.id, level: round.level },
        level: game.toPublicLevel(game.getLevel(round.level)) as RoundStartResponse["level"],
        session: toSessionSnapshot(session, round),
      };
      timing?.mark("assemble", assembleStart, "build-json");
      return response;
    },

    /** Called when the image has been painted; JSON-only variant (tests, legacy browser dispatch). */
    async beginRound(roundId: string, playerId: string): Promise<BeginRoundResponse> {
      const { begun, run } = await beginRoundCore(roundId, playerId);
      if (run) await run.done;
      return begun;
    },

    /** Local fake AI path invoked by the browser in DECISIONS_MODE=fake (same-origin, no OpenAI). */
    async runAiForRound(roundId: string) {
      const round = await deps.games.getRound(roundId);
      if (!round || round.shownAt === null) return;
      if (round.aiStatus === "complete" || round.aiStatus === "error") return;
      if (round.aiStatus === "running") return;
      if (!(await deps.games.claimAiRun(roundId, deps.now()))) return;
      const level = game.getLevel(round.level);
      let answer: DecisionResult;
      try {
        answer = await deps.decisions.decide(await game.buildDecisionInput(level), AbortSignal.timeout(aiTimeoutMs));
      } catch {
        answer = { status: "error", choice: null, confidence: null, probabilities: {}, modelElapsedMs: 0, errorCode: "network_error", requestId: "none", elapsedMs: 0 };
      }
      await persistAiAnswer(round, answer);
    },

    /** Authoritative AI result reported by the Decisions Worker after a browser-initiated call. */
    async ingestWorkerAiResult(input: { roundId: string; jti: string; result: WorkerDecisionResponse; wallElapsedMs?: number }) {
      const round = await deps.games.getRound(input.roundId);
      if (!round || round.shownAt === null) throw new GameError("not_found");
      if (round.aiStatus !== "running" && round.aiStatus !== "pending") return { accepted: false as const };
      if (round.aiStatus === "pending" && !(await deps.games.claimAiRun(input.roundId, deps.now()))) {
        const latest = await deps.games.getRound(input.roundId);
        if (!latest || latest.aiStatus !== "running") return { accepted: false as const };
      }
      await persistAiAnswer(round, input.result, input.wallElapsedMs);
      return { accepted: true as const };
    },

    async submitRound(roundId: string, playerId: string, input: { choice: string | null; elapsedMs: number }): Promise<SubmitResponse> {
      const { round, session } = await loadOwnedRound(roundId, playerId);
      const level = game.getLevel(round.level);

      if (!round.humanStatus) {
        if (round.shownAt === null) throw new GameError("round_not_started");
        if (session.status !== "active" || session.level !== round.level) throw new GameError("session_ended");
        if (input.choice !== null && !game.isValidAnswer(level, input.choice)) throw new GameError("invalid_choice");

        const now = deps.now();
        const elapsedMs = reconcileElapsed({ clientElapsedMs: input.elapsedMs, serverElapsedMs: now - round.shownAt });
        const human = resolveHumanAnswer({ choice: input.choice, judge: (choice) => game.judge(level, choice), elapsedMs, limitMs: level.limitMs });
        const next = advanceSession({ level: round.level, lives: session.lives, humanStatus: human.status, totalLevels: game.totalLevels });
        const ended = next.ended;
        const settled = await deps.games.submitHumanAnswer({
          roundId,
          status: human.status,
          choice: human.status === "timeout" ? null : input.choice,
          elapsedMs: human.elapsedMs,
          clientElapsedMs: input.elapsedMs,
          now,
          session: {
            level: ended ? round.level : (next.nextLevel ?? round.level),
            lives: next.lives,
            status: ended ? "ended" : "active",
            reachedLevel: ended ? round.level : (next.nextLevel ?? round.level),
            cleared: next.cleared,
          },
          result: ended ? { id: deps.randomId(), publicId: deps.randomPublicId() } : null,
        });
        if (settled) {
          await trackLater("level_result", { playerId, sessionId: session.id, level: round.level, metadata: { human: human.status, elapsedMs: human.elapsedMs, lives: next.lives } });
          if (ended) await trackLater("run_end", { playerId, sessionId: session.id, level: round.level, metadata: { reachedLevel: round.level, cleared: next.cleared } });
        }
      }

      // Round + session re-read in parallel: one D1 round-trip less on the tap-to-reveal path.
      const [fresh, freshSession] = await Promise.all([deps.games.getRound(roundId), refreshSession(session.id)]);
      let current = fresh ?? round;
      const deadline = deps.now() + aiRevealWaitMs;
      // No server-side wait by default: the client shows the still-running AI and fetches it once it answers.
      while ((current.aiStatus === "running" || current.aiStatus === "pending") && deps.now() < deadline) {
        await sleep(100);
        current = (await deps.games.getRound(roundId)) ?? current;
      }
      const waited = current !== (fresh ?? round);
      current = await expireIfStale(current);
      return { round: toReveal(current), session: waited ? await refreshSession(session.id) : freshSession };
    },

    async getRound(roundId: string, playerId: string): Promise<SubmitResponse> {
      const { round, session } = await loadOwnedRound(roundId, playerId);
      const current = await expireIfStale(round);
      return { round: toReveal(current), session: await sessionSnapshot((await deps.games.getSession(session.id)) ?? session) };
    },

    /**
     * The result view plus the run's owner. Default path: one D1 batch (getResultBundle). RESULT_BUNDLE=off falls back
     * to the original sequential queries (kept as a kill switch; same output, see tests/integration/result-bundle.test.ts).
     */
    getResultWithOwner: resultWithOwner,

    async getResult(publicId: string): Promise<ResultView | null> {
      return (await resultWithOwner(publicId))?.view ?? null;
    },

    /** The plugin's level-set version (leaderboards are per version). */
    levelSetVersion: deps.game.levelSetVersion,

    async getResultOwner(publicId: string) {
      const row = await deps.games.getResultByPublicId(publicId);
      return row?.result.playerId ?? null;
    },

    async getLevelStats() {
      return deps.leaderboard.levelStats(deps.game.levelSetVersion);
    },

    async getLeaderboard(input: { viewerPlayerId: string | null; limit: number }) {
      const version = deps.game.levelSetVersion;
      // Top rows and the viewer's position are independent: fetch them concurrently (2 round trips at most, was 4).
      const viewer = input.viewerPlayerId;
      const [top, viewerIndex] = await Promise.all([
        deps.leaderboard.list({ limit: input.limit, version }),
        viewer ? deps.leaderboard.getDisplayIndex(viewer, version) : Promise.resolve(null),
      ]);
      const toRow = (row: { playerId: string; nickname: string | null; reachedLevel: number; rank: number }): LeaderboardRow => ({
        rank: row.rank,
        nickname: row.nickname ?? `玩家 ${row.playerId.slice(0, 4).toUpperCase()}`,
        reachedLevel: row.reachedLevel,
        isMe: row.playerId === input.viewerPlayerId,
      });
      let around: LeaderboardRow[] = [];
      if (viewer && viewerIndex !== null && !top.some((row) => row.playerId === viewer)) {
        around = (await deps.leaderboard.list({ limit: 3, offset: Math.max(0, viewerIndex - 1), version })).map(toRow);
      }
      return { version, top: top.map(toRow), around };
    },

    async recordClientEvent(event: { name: string; playerId: string; sessionId?: string | null; level?: number | null; clientTs: number; metadata?: Record<string, unknown> }) {
      if (event.sessionId) {
        const session = await deps.games.getSession(event.sessionId);
        if (!session || session.playerId !== event.playerId) throw new GameError("not_found");
      }
      await deps.games.insertEvent({
        name: event.name,
        source: "client",
        playerId: event.playerId,
        sessionId: event.sessionId ?? null,
        level: event.level ?? null,
        clientTs: event.clientTs,
        serverTs: deps.now(),
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      });
    },
  };
}

export type GameService = ReturnType<typeof createGameService>;
