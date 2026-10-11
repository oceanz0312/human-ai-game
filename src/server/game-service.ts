import type { AiDispatch, BeginRoundResponse, LeaderboardRow, ResultView, RoundReveal, RoundStartResponse, SessionSnapshot, SubmitResponse } from "../game/contracts";
import { LEVEL_SET_VERSION } from "../game/contracts";
import { parseStoredProbabilities } from "../game/ai-insights";
import { advanceSession, reconcileElapsed, resolveHumanAnswer, resolveRace } from "../game/rules";
import type { DecisionClient, DecisionResult, WorkerDecisionResponse } from "./decisions/contracts";
import { signDecisionTicket, sha256HexFromDataUrl, ticketExpiresAt } from "./decisions/ticket";
import { GameError } from "./errors";
import type { PrivateLevel } from "./levels/catalog";
import type { GameRepository, LeaderboardRepository, RoundRow, SessionRow } from "./repositories/game-repository";

export interface GameServiceDeps {
  games: GameRepository;
  leaderboard: LeaderboardRepository;
  decisions: DecisionClient;
  now: () => number;
  randomId: () => string;
  randomPublicId: () => string;
  getLevel: (level: number) => PrivateLevel;
  toPublicLevel: (level: PrivateLevel) => RoundStartResponse["level"];
  readLevelImage: (level: number) => Promise<string>;
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
  /** worker: browser → Decisions Worker; fake: same-origin dev stand-in; off: AI stays offline. */
  decisionsDispatchMode?: "worker" | "fake" | "off";
}

export function createGameService(deps: GameServiceDeps) {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const aiRevealWaitMs = deps.aiRevealWaitMs ?? 1500;
  const aiTimeoutMs = deps.aiTimeoutMs ?? 10_000;
  const aiStaleMs = aiTimeoutMs + 5_000;
  const maxSessionsPerHour = deps.maxSessionsPerHour ?? 40;

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
    const session = await deps.games.getSession(sessionId);
    if (!session || session.playerId !== playerId) throw new GameError("not_found");
    return session;
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
    return {
      id: session.id,
      level: session.level,
      lives: session.lives,
      fasterThanAiCount: session.fasterThanAiCount,
      status: session.status,
      reachedLevel: session.reachedLevel,
      cleared: session.cleared,
      publicId: result?.publicId ?? null,
      activeRound: open ? { id: open.id, level: open.level, shown: open.shownAt !== null } : null,
    };
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
    };
  }

  function toReveal(round: RoundRow): RoundReveal {
    const level = deps.getLevel(round.level);
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
      gridSize: level.gridSize,
      imageUrl: level.imageUrl,
      correctChoice: lockedIn ? level.correctChoice : null,
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
    const level = deps.getLevel(round.level);
    const complete = answer.status === "complete" && answer.choice !== null && level.choices.includes(answer.choice);
    const elapsedMs = complete ? (wallElapsedMs ?? ("elapsedMs" in answer ? answer.elapsedMs : null) ?? answer.modelElapsedMs) : null;
    await deps.games.saveAiAnswer(
      round.id,
      {
        status: complete ? "complete" : "error",
        choice: complete ? answer.choice : null,
        correct: complete ? answer.choice === level.correctChoice : null,
        elapsedMs: complete ? elapsedMs : null,
        modelElapsedMs: answer.modelElapsedMs,
        confidence: complete ? answer.confidence : null,
        probabilities: complete ? answer.probabilities : {},
        errorCode: complete ? null : (answer.errorCode ?? "invalid_choice"),
        requestId: answer.requestId,
      },
      deps.now(),
    );
    await track("ai_answered", {
      sessionId: round.sessionId,
      level: round.level,
      metadata: {
        status: complete ? "complete" : "error",
        correct: complete ? answer.choice === level.correctChoice : null,
        elapsedMs,
        modelElapsedMs: answer.modelElapsedMs,
        errorCode: answer.errorCode,
      },
    });
  }

  async function buildAiDispatch(round: RoundRow, level: PrivateLevel): Promise<AiDispatch | null> {
    const mode = deps.decisionsDispatchMode ?? "off";
    if (mode === "fake") return { mode: "fake", url: `/api/rounds/${round.id}/ai-fake` };
    if (mode !== "worker" || !deps.decisionsWorkerPublicUrl || !deps.decisionsTicketSecret) return null;
    const imageDataUrl = await deps.readLevelImage(round.level);
    const imageSha256 = await sha256HexFromDataUrl(imageDataUrl);
    const now = deps.now();
    const ticket = await signDecisionTicket(
      {
        v: 1,
        jti: deps.randomId(),
        roundId: round.id,
        sessionId: round.sessionId,
        level: round.level,
        imageSha256,
        choices: level.choices,
        exp: ticketExpiresAt(now, level.limitMs),
        iat: now,
      },
      deps.decisionsTicketSecret,
    );
    return { mode: "worker", url: new URL("/v1/decide-ticket", deps.decisionsWorkerPublicUrl).toString(), ticket, issuedAt: now };
  }

  return {
    async ensurePlayer(playerId: string | null) {
      const id = playerId ?? deps.randomId();
      const existing = playerId ? await deps.games.getPlayer(playerId) : null;
      return existing ?? (await deps.games.createPlayer(id, deps.now()));
    },

    async setNickname(playerId: string, nickname: string) {
      await deps.games.setNickname(playerId, nickname);
    },

    async createSession(input: { playerId: string; nickname?: string; replay?: boolean }): Promise<SessionSnapshot> {
      const recent = await deps.games.countSessionsSince(input.playerId, deps.now() - 60 * 60 * 1000);
      if (recent >= maxSessionsPerHour) throw new GameError("too_many_requests");
      if (input.nickname) await deps.games.setNickname(input.playerId, input.nickname);
      const session = await deps.games.createSession({ id: deps.randomId(), playerId: input.playerId, now: deps.now() });
      await track(input.replay ? "replay" : "game_start", { playerId: input.playerId, sessionId: session.id, level: 1 });
      return sessionSnapshot(session);
    },

    async getSession(sessionId: string, playerId: string) {
      return sessionSnapshot(await loadOwnedSession(sessionId, playerId));
    },

    async startNextRound(sessionId: string, playerId: string): Promise<RoundStartResponse> {
      const session = await loadOwnedSession(sessionId, playerId);
      if (session.status !== "active") throw new GameError("session_ended");
      const open = await deps.games.getOpenRound(session.id);
      if (open && open.shownAt !== null) throw new GameError("round_in_progress");
      const round = open ?? (await deps.games.createRound({ id: deps.randomId(), sessionId: session.id, level: session.level, now: deps.now() }));
      return {
        round: { id: round.id, level: round.level },
        level: deps.toPublicLevel(deps.getLevel(round.level)),
        session: await sessionSnapshot(session),
      };
    },

    /** Called when the image has been painted; starts the server clock and returns a browser AI dispatch ticket when configured. */
    async beginRound(roundId: string, playerId: string): Promise<BeginRoundResponse> {
      const { round } = await loadOwnedRound(roundId, playerId);
      if (round.humanStatus) return { roundId: round.id, deadlineAt: round.deadlineAt, started: false, ai: null };
      const level = deps.getLevel(round.level);
      const firstPaint = round.shownAt === null;
      const marked = await deps.games.markShown(round.id, deps.now(), level.limitMs);
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
      return { roundId: marked.id, deadlineAt: marked.deadlineAt, started: firstPaint, ai };
    },

    /** Local fake AI path invoked by the browser in DECISIONS_MODE=fake (same-origin, no OpenAI). */
    async runAiForRound(roundId: string) {
      const round = await deps.games.getRound(roundId);
      if (!round || round.shownAt === null) return;
      if (round.aiStatus === "complete" || round.aiStatus === "error") return;
      if (round.aiStatus === "running") return;
      if (!(await deps.games.claimAiRun(roundId, deps.now()))) return;
      const level = deps.getLevel(round.level);
      let answer: DecisionResult;
      try {
        const imageDataUrl = await deps.readLevelImage(round.level);
        answer = await deps.decisions.decide({ imageDataUrl, choices: level.choices }, AbortSignal.timeout(aiTimeoutMs));
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
      const level = deps.getLevel(round.level);

      if (!round.humanStatus) {
        if (round.shownAt === null) throw new GameError("round_not_started");
        if (session.status !== "active" || session.level !== round.level) throw new GameError("session_ended");
        if (input.choice !== null && !level.choices.includes(input.choice)) throw new GameError("invalid_choice");

        const now = deps.now();
        const elapsedMs = reconcileElapsed({ clientElapsedMs: input.elapsedMs, serverElapsedMs: now - round.shownAt });
        const human = resolveHumanAnswer({ choice: input.choice, correctChoice: level.correctChoice, elapsedMs, limitMs: level.limitMs });
        const next = advanceSession({ level: round.level, lives: session.lives, humanStatus: human.status });
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
          await track("level_result", { playerId, sessionId: session.id, level: round.level, metadata: { human: human.status, elapsedMs: human.elapsedMs, lives: next.lives } });
          if (ended) await track("run_end", { playerId, sessionId: session.id, level: round.level, metadata: { reachedLevel: round.level, cleared: next.cleared } });
        }
      }

      let current = (await deps.games.getRound(roundId)) ?? round;
      const deadline = deps.now() + aiRevealWaitMs;
      while ((current.aiStatus === "running" || current.aiStatus === "pending") && deps.now() < deadline) {
        await sleep(100);
        current = (await deps.games.getRound(roundId)) ?? current;
      }
      current = await expireIfStale(current);
      return { round: toReveal(current), session: await refreshSession(session.id) };
    },

    async getRound(roundId: string, playerId: string): Promise<SubmitResponse> {
      const { round, session } = await loadOwnedRound(roundId, playerId);
      const current = await expireIfStale(round);
      return { round: toReveal(current), session: await sessionSnapshot((await deps.games.getSession(session.id)) ?? session) };
    },

    async getResult(publicId: string): Promise<ResultView | null> {
      const row = await deps.games.getResultByPublicId(publicId);
      if (!row) return null;
      const best = await deps.leaderboard.getBest(row.result.playerId, row.result.levelSetVersion);
      const bestLevel = best?.bestLevel ?? row.result.reachedLevel;
      return {
        publicId: row.result.publicId,
        nickname: row.nickname,
        reachedLevel: row.result.reachedLevel,
        fasterThanAiCount: row.session.fasterThanAiCount,
        cleared: row.result.cleared,
        rank: await deps.leaderboard.getRankForLevel(bestLevel, row.result.levelSetVersion),
        bestLevel,
        endedAt: row.result.createdAt,
      };
    },

    async getResultOwner(publicId: string) {
      const row = await deps.games.getResultByPublicId(publicId);
      return row?.result.playerId ?? null;
    },

    async getLeaderboard(input: { viewerPlayerId: string | null; limit: number }) {
      const top = await deps.leaderboard.list({ limit: input.limit });
      const toRow = (row: { playerId: string; nickname: string | null; reachedLevel: number; rank: number }): LeaderboardRow => ({
        rank: row.rank,
        nickname: row.nickname ?? `玩家 ${row.playerId.slice(0, 4).toUpperCase()}`,
        reachedLevel: row.reachedLevel,
        isMe: row.playerId === input.viewerPlayerId,
      });
      let around: LeaderboardRow[] = [];
      if (input.viewerPlayerId && !top.some((row) => row.playerId === input.viewerPlayerId)) {
        const index = await deps.leaderboard.getDisplayIndex(input.viewerPlayerId);
        if (index !== null) around = (await deps.leaderboard.list({ limit: 3, offset: Math.max(0, index - 1) })).map(toRow);
      }
      return { version: LEVEL_SET_VERSION, top: top.map(toRow), around };
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
