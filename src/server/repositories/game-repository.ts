import { and, desc, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";
import type { HumanStatus, Winner } from "../../game/contracts";
import { LEVEL_SET_VERSION, STARTING_LIVES } from "../../game/contracts";
import { resolveRace } from "../../game/rules";
import type { Database } from "../db/client";
import { bests, dailyPlays, events, players, results, rounds, sessions } from "../db/schema";

export type SessionRow = typeof sessions.$inferSelect;
export type RoundRow = typeof rounds.$inferSelect;
export type ResultRow = typeof results.$inferSelect;

export interface AiAnswerInput {
  status: "complete" | "error";
  choice: string | null;
  correct: boolean | null;
  elapsedMs: number | null;
  modelElapsedMs: number | null;
  confidence: number | null;
  probabilities: Record<string, number>;
  errorCode: string | null;
  errorDetail: string | null;
  requestId: string | null;
}

export interface HumanSettlementInput {
  roundId: string;
  status: HumanStatus;
  choice: string | null;
  elapsedMs: number;
  clientElapsedMs: number;
  now: number;
  session: { level: number; lives: number; status: "active" | "ended"; reachedLevel: number; cleared: boolean };
  result: { id: string; publicId: string } | null;
}

/**
 * Writes avoid interactive transactions because Cloudflare D1 only offers atomic batches. Every
 * multi-statement write is one `db.batch` whose statements are guarded so duplicates are no-ops.
 */
export function createGameRepository(db: Database) {
  /** Human and AI fields are each written once, so any caller that sees both computes the same race. */
  async function settleRace(roundId: string): Promise<void> {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    if (!round || !round.humanStatus || round.fasterThanAi !== null) return;
    if (round.aiStatus !== "complete" && round.aiStatus !== "error") return;
    const race = resolveRace({
      humanCorrect: round.humanStatus === "correct",
      humanElapsedMs: round.humanElapsedMs ?? Number.POSITIVE_INFINITY,
      aiStatus: round.aiStatus,
      aiCorrect: round.aiCorrect,
      aiElapsedMs: round.aiElapsedMs,
    });
    await db.batch([
      db
        .update(rounds)
        .set({ winner: race.winner as Exclude<Winner, "pending">, fasterThanAi: race.fasterThanAi })
        .where(and(eq(rounds.id, roundId), isNull(rounds.fasterThanAi))),
      db
        .update(sessions)
        .set({ fasterThanAiCount: sql`(SELECT count(*) FROM rounds WHERE rounds.session_id = ${round.sessionId} AND rounds.faster_than_ai = 1)` })
        .where(eq(sessions.id, round.sessionId)),
    ]);
  }

  return {
    async createPlayer(id: string, now: number) {
      await db.insert(players).values({ id, createdAt: now }).onConflictDoNothing();
      const [row] = await db.select().from(players).where(eq(players.id, id));
      return row;
    },

    async getPlayer(id: string) {
      const [row] = await db.select().from(players).where(eq(players.id, id));
      return row ?? null;
    },

    async setNickname(playerId: string, nickname: string) {
      await db.update(players).set({ nickname }).where(eq(players.id, playerId));
    },

    async countSessionsSince(playerId: string, since: number) {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(and(eq(sessions.playerId, playerId), gte(sessions.createdAt, since)));
      return Number(row?.count ?? 0);
    },

    async createSession(input: { id: string; playerId: string; now: number; levelSetVersion?: string; startingChances?: number; gameId?: string; modelId?: string }) {
      const [row] = await db
        .insert(sessions)
        .values({
          id: input.id,
          playerId: input.playerId,
          levelSetVersion: input.levelSetVersion ?? LEVEL_SET_VERSION,
          ...(input.gameId ? { gameId: input.gameId } : {}),
          ...(input.modelId ? { modelId: input.modelId } : {}),
          level: 1,
          lives: input.startingChances ?? STARTING_LIVES,
          fasterThanAiCount: 0,
          status: "active",
          reachedLevel: 1,
          cleared: false,
          createdAt: input.now,
        })
        .returning();
      return row;
    },

    async getSession(id: string): Promise<SessionRow | null> {
      const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
      return row ?? null;
    },

    async getOwnedSession(sessionId: string, playerId: string): Promise<SessionRow | null> {
      const [row] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.playerId, playerId)));
      return row ?? null;
    },

    async getOpenRound(sessionId: string): Promise<RoundRow | null> {
      const [row] = await db
        .select()
        .from(rounds)
        .where(and(eq(rounds.sessionId, sessionId), isNull(rounds.humanStatus)))
        .orderBy(desc(rounds.level))
        .limit(1);
      return row ?? null;
    },

    async getRoundForLevel(sessionId: string, level: number): Promise<RoundRow | null> {
      const [row] = await db.select().from(rounds).where(and(eq(rounds.sessionId, sessionId), eq(rounds.level, level)));
      return row ?? null;
    },

    async createRound(input: { id: string; sessionId: string; level: number; now: number }) {
      const inserted = await db
        .insert(rounds)
        .values({ id: input.id, sessionId: input.sessionId, level: input.level, createdAt: input.now, aiStatus: "pending" })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 1) return inserted[0];
      const [row] = await db.select().from(rounds).where(and(eq(rounds.sessionId, input.sessionId), eq(rounds.level, input.level)));
      return row;
    },

    async getRound(id: string): Promise<RoundRow | null> {
      const [row] = await db.select().from(rounds).where(eq(rounds.id, id));
      return row ?? null;
    },

    /** Records the first paint reported by the client; later calls keep the original start. */
    async markShown(roundId: string, now: number, limitMs: number) {
      const updated = await db
        .update(rounds)
        .set({ shownAt: now, deadlineAt: now + limitMs })
        .where(and(eq(rounds.id, roundId), isNull(rounds.shownAt), isNull(rounds.humanStatus)))
        .returning();
      if (updated.length === 1) return updated[0];
      const [row] = await db.select().from(rounds).where(eq(rounds.id, roundId));
      return row;
    },

    /**
     * Daily play limit: atomically take one play if `count < limit`. Returns the new count, or null when
     * the budget for (key, day, scope) is already used up.
     */
    async consumeDailyPlay(input: { key: string; day: string; scope: string; limit: number; now: number }): Promise<number | null> {
      const rows = await db
        .insert(dailyPlays)
        .values({ key: input.key, day: input.day, scope: input.scope, count: 1, updatedAt: input.now })
        .onConflictDoUpdate({
          target: [dailyPlays.key, dailyPlays.day, dailyPlays.scope],
          set: { count: sql`${dailyPlays.count} + 1`, updatedAt: input.now },
          setWhere: sql`${dailyPlays.count} < ${input.limit}`,
        })
        .returning({ count: dailyPlays.count });
      return rows[0] ? Number(rows[0].count) : null;
    },

    /** Gives a play back (session creation failed after the play was taken). */
    async refundDailyPlay(input: { key: string; day: string; scope: string }) {
      await db
        .update(dailyPlays)
        .set({ count: sql`max(0, ${dailyPlays.count} - 1)` })
        .where(and(eq(dailyPlays.key, input.key), eq(dailyPlays.day, input.day), eq(dailyPlays.scope, input.scope)));
    },

    async countDailyPlays(input: { key: string; day: string; scope: string }) {
      const [row] = await db
        .select({ count: dailyPlays.count })
        .from(dailyPlays)
        .where(and(eq(dailyPlays.key, input.key), eq(dailyPlays.day, input.day), eq(dailyPlays.scope, input.scope)));
      return Number(row?.count ?? 0);
    },

    /** Atomically moves the AI lease from pending to running; only the winner may call the Worker. */
    async claimAiRun(roundId: string, now: number, modelId?: string): Promise<boolean> {
      const claimed = await db
        .update(rounds)
        .set({ aiStatus: "running", aiStartedAt: now, ...(modelId ? { aiModelId: modelId } : {}) })
        .where(and(eq(rounds.id, roundId), eq(rounds.aiStatus, "pending")))
        .returning({ id: rounds.id });
      return claimed.length === 1;
    },

    async saveAiAnswer(roundId: string, answer: AiAnswerInput, now: number) {
      const saved = await db
        .update(rounds)
        .set({
          aiStatus: answer.status,
          aiCompletedAt: now,
          aiChoice: answer.choice,
          aiCorrect: answer.correct,
          aiElapsedMs: answer.elapsedMs,
          aiModelElapsedMs: answer.modelElapsedMs,
          aiConfidence: answer.confidence,
          aiProbabilities: JSON.stringify(answer.probabilities),
          aiErrorCode: answer.errorCode,
          aiErrorDetail: answer.errorDetail,
          aiRequestId: answer.requestId,
        })
        .where(and(eq(rounds.id, roundId), eq(rounds.aiStatus, "running")))
        .returning({ id: rounds.id });
      if (saved.length === 1) await settleRace(roundId);
      return saved.length === 1;
    },

    /** A running lease older than the Worker timeout is closed as an AI timeout instead of re-billing. */
    async expireStaleAi(roundId: string, staleBefore: number, now: number) {
      const expired = await db
        .update(rounds)
        .set({ aiStatus: "error", aiErrorCode: "ai_timeout", aiCompletedAt: now })
        .where(and(eq(rounds.id, roundId), eq(rounds.aiStatus, "running"), lt(rounds.aiStartedAt, staleBefore)))
        .returning({ id: rounds.id });
      if (expired.length === 1) await settleRace(roundId);
      return expired.length === 1;
    },

    /**
     * Persists the first human settlement only; returns false when the round was already settled.
     * The session update only applies while the session still sits on this round's level, so a
     * duplicate or late retry can never overwrite newer progress.
     */
    async submitHumanAnswer(input: HumanSettlementInput): Promise<boolean> {
      const roundSession = sql`(SELECT session_id FROM rounds WHERE rounds.id = ${input.roundId})`;
      const roundLevel = sql`(SELECT level FROM rounds WHERE rounds.id = ${input.roundId})`;
      const endedSession = and(eq(sessions.id, roundSession), eq(sessions.status, "ended"));
      const [settled] = await db.batch([
        db
          .update(rounds)
          .set({
            humanStatus: input.status,
            humanChoice: input.choice,
            humanElapsedMs: input.elapsedMs,
            humanClientElapsedMs: input.clientElapsedMs,
            humanSubmittedAt: input.now,
          })
          .where(and(eq(rounds.id, input.roundId), isNull(rounds.humanStatus)))
          .returning({ id: rounds.id }),
        db
          .update(sessions)
          .set({
            level: input.session.level,
            lives: input.session.lives,
            status: input.session.status,
            reachedLevel: input.session.reachedLevel,
            cleared: input.session.cleared,
            endedAt: input.session.status === "ended" ? input.now : null,
          })
          .where(and(eq(sessions.id, roundSession), eq(sessions.level, roundLevel), eq(sessions.status, "active"))),
        ...(input.result
          ? [
              db
                .insert(results)
                .select(
                  db
                    .select({
                      id: sql`${input.result.id}`.as("id"),
                      sessionId: sessions.id,
                      publicId: sql`${input.result.publicId}`.as("public_id"),
                      playerId: sessions.playerId,
                      levelSetVersion: sessions.levelSetVersion,
                      gameId: sessions.gameId,
                      modelId: sessions.modelId,
                      reachedLevel: sql`${input.session.reachedLevel}`.as("reached_level"),
                      cleared: sql`${input.session.cleared ? 1 : 0}`.as("cleared"),
                      createdAt: sql`${input.now}`.as("created_at"),
                    })
                    .from(sessions)
                    .where(endedSession),
                )
                .onConflictDoNothing(),
              db
                .insert(bests)
                .select(
                  db
                    .select({
                      playerId: sessions.playerId,
                      levelSetVersion: sessions.levelSetVersion,
                      bestLevel: sql`${input.session.reachedLevel}`.as("best_level"),
                      achievedAt: sql`${input.now}`.as("achieved_at"),
                    })
                    .from(sessions)
                    .where(endedSession),
                )
                .onConflictDoUpdate({
                  target: [bests.playerId, bests.levelSetVersion],
                  set: {
                    achievedAt: sql`CASE WHEN excluded.best_level > ${bests.bestLevel} THEN excluded.achieved_at ELSE ${bests.achievedAt} END`,
                    bestLevel: sql`MAX(${bests.bestLevel}, excluded.best_level)`,
                  },
                }),
            ]
          : []),
      ]);
      if (settled.length !== 1) return false;
      await settleRace(input.roundId);
      return true;
    },

    async getResultBySession(sessionId: string): Promise<ResultRow | null> {
      const [row] = await db.select().from(results).where(eq(results.sessionId, sessionId));
      return row ?? null;
    },

    async getResultByPublicId(publicId: string) {
      const [row] = await db
        .select({ result: results, session: sessions, nickname: players.nickname })
        .from(results)
        .innerJoin(sessions, eq(sessions.id, results.sessionId))
        .innerJoin(players, eq(players.id, results.playerId))
        .where(eq(results.publicId, publicId));
      return row ?? null;
    },

    /** Settled rounds of one run and how many each side got right (drives the accuracy framing on results). */
    async sessionAccuracy(sessionId: string) {
      const [row] = await db
        .select({
          played: sql<number>`count(${rounds.humanStatus})`,
          humanCorrect: sql<number>`coalesce(sum(case when ${rounds.humanStatus} = 'correct' then 1 else 0 end), 0)`,
          aiCorrect: sql<number>`coalesce(sum(case when ${rounds.humanStatus} is not null and ${rounds.aiCorrect} = 1 then 1 else 0 end), 0)`,
        })
        .from(rounds)
        .where(eq(rounds.sessionId, sessionId));
      return { played: Number(row?.played ?? 0), humanCorrect: Number(row?.humanCorrect ?? 0), aiCorrect: Number(row?.aiCorrect ?? 0) };
    },

    /** Per-level outcome of settled rounds, in level order (core result grid). */
    async sessionOutcomes(sessionId: string) {
      const rows = await db
        .select({ level: rounds.level, humanStatus: rounds.humanStatus, winner: rounds.winner, aiStatus: rounds.aiStatus })
        .from(rounds)
        .where(eq(rounds.sessionId, sessionId))
        .orderBy(rounds.level);
      return rows.filter((row) => row.humanStatus !== null);
    },

    async insertEvent(event: typeof events.$inferInsert) {
      await db.insert(events).values(event);
    },
  };
}

export interface LevelStatsRow {
  level: number;
  samples: number;
  humanWins: number;
  humanCorrect: number;
  aiAnswered: number;
  aiCorrect: number;
  aiAvgMs: number | null;
  fastestHumanMs: number | null;
}

export function createLeaderboardRepository(db: Database) {
  return {
    /** Aggregate public per-level stats from settled rounds (no answers, no player ids). */
    async levelStats(version = LEVEL_SET_VERSION): Promise<LevelStatsRow[]> {
      const rows = await db
        .select({
          level: rounds.level,
          samples: sql<number>`count(*)`,
          humanWins: sql<number>`sum(case when ${rounds.winner} = 'human' then 1 else 0 end)`,
          humanCorrect: sql<number>`sum(case when ${rounds.humanStatus} = 'correct' then 1 else 0 end)`,
          aiAnswered: sql<number>`sum(case when ${rounds.aiStatus} = 'complete' then 1 else 0 end)`,
          aiCorrect: sql<number>`sum(case when ${rounds.aiCorrect} = 1 then 1 else 0 end)`,
          aiAvgMs: sql<number | null>`avg(case when ${rounds.aiStatus} = 'complete' then ${rounds.aiElapsedMs} end)`,
          fastestHumanMs: sql<number | null>`min(case when ${rounds.humanStatus} = 'correct' then ${rounds.humanElapsedMs} end)`,
        })
        .from(rounds)
        .innerJoin(sessions, eq(sessions.id, rounds.sessionId))
        .where(and(eq(sessions.levelSetVersion, version), sql`${rounds.humanStatus} is not null`))
        .groupBy(rounds.level);
      return rows.map((row) => ({
        level: Number(row.level),
        samples: Number(row.samples),
        humanWins: Number(row.humanWins ?? 0),
        humanCorrect: Number(row.humanCorrect ?? 0),
        aiAnswered: Number(row.aiAnswered ?? 0),
        aiCorrect: Number(row.aiCorrect ?? 0),
        aiAvgMs: row.aiAvgMs == null ? null : Math.round(Number(row.aiAvgMs)),
        fastestHumanMs: row.fastestHumanMs == null ? null : Number(row.fastestHumanMs),
      }));
    },

    async getBest(playerId: string, version = LEVEL_SET_VERSION) {
      const [row] = await db
        .select()
        .from(bests)
        .where(and(eq(bests.playerId, playerId), eq(bests.levelSetVersion, version)));
      return row ?? null;
    },

    /** Rank is 1 + the number of players with a strictly higher best level, so equal levels tie. */
    async getRankForLevel(reachedLevel: number, version = LEVEL_SET_VERSION) {
      const [row] = await db
        .select({ higher: sql<number>`count(*)` })
        .from(bests)
        .where(and(eq(bests.levelSetVersion, version), gt(bests.bestLevel, reachedLevel)));
      return 1 + Number(row?.higher ?? 0);
    },

    async getRankForPlayer(playerId: string, version = LEVEL_SET_VERSION) {
      const best = await this.getBest(playerId, version);
      if (!best) return null;
      return { rank: await this.getRankForLevel(best.bestLevel, version), reachedLevel: best.bestLevel };
    },

    async list(input: { version?: string; limit: number; offset?: number }) {
      const version = input.version ?? LEVEL_SET_VERSION;
      const rows = await db
        .select({
          playerId: bests.playerId,
          nickname: players.nickname,
          reachedLevel: bests.bestLevel,
          rank: sql<number>`1 + (SELECT count(*) FROM bests AS higher WHERE higher.level_set_version = ${version} AND higher.best_level > ${bests.bestLevel})`,
        })
        .from(bests)
        .innerJoin(players, eq(players.id, bests.playerId))
        .where(eq(bests.levelSetVersion, version))
        .orderBy(desc(bests.bestLevel), bests.achievedAt, bests.playerId)
        .limit(input.limit)
        .offset(input.offset ?? 0);
      return rows.map((row) => ({ ...row, rank: Number(row.rank) }));
    },

    /** Per-model board from results: each player's best run against that model. */
    async listByModel(input: { version?: string; modelId: string; limit: number }) {
      const version = input.version ?? LEVEL_SET_VERSION;
      const rows = await db
        .select({
          playerId: results.playerId,
          nickname: players.nickname,
          reachedLevel: sql<number>`max(${results.reachedLevel})`,
          achievedAt: sql<number>`min(${results.createdAt})`,
        })
        .from(results)
        .innerJoin(players, eq(players.id, results.playerId))
        .where(and(eq(results.levelSetVersion, version), eq(results.modelId, input.modelId)))
        .groupBy(results.playerId)
        .orderBy(sql`max(${results.reachedLevel}) desc`, sql`min(${results.createdAt})`, results.playerId)
        .limit(input.limit);
      let rank = 0;
      let previous = Number.POSITIVE_INFINITY;
      return rows.map((row, index) => {
        const level = Number(row.reachedLevel);
        if (level < previous) rank = index + 1;
        previous = level;
        return { playerId: row.playerId, nickname: row.nickname, reachedLevel: level, rank };
      });
    },

    /** Runs and win stats per model (opponent select). Human "win" = round winner human. */
    async modelStats(input: { version?: string; modelId: string }) {
      const version = input.version ?? LEVEL_SET_VERSION;
      const [row] = await db
        .select({
          runs: sql<number>`count(distinct ${sessions.id})`,
          rounds: sql<number>`count(${rounds.id})`,
          aiCorrect: sql<number>`sum(case when ${rounds.aiCorrect} = 1 then 1 else 0 end)`,
          humanWins: sql<number>`sum(case when ${rounds.winner} = 'human' then 1 else 0 end)`,
          aiWins: sql<number>`sum(case when ${rounds.winner} = 'ai' then 1 else 0 end)`,
          aiMedianish: sql<number>`avg(case when ${rounds.aiStatus} = 'complete' then ${rounds.aiElapsedMs} end)`,
        })
        .from(sessions)
        .leftJoin(rounds, and(eq(rounds.sessionId, sessions.id), sql`${rounds.humanStatus} is not null`))
        .where(and(eq(sessions.levelSetVersion, version), eq(sessions.modelId, input.modelId), eq(sessions.status, "ended")));
      return {
        runs: Number(row?.runs ?? 0),
        rounds: Number(row?.rounds ?? 0),
        aiCorrect: Number(row?.aiCorrect ?? 0),
        humanWins: Number(row?.humanWins ?? 0),
        aiWins: Number(row?.aiWins ?? 0),
        aiAvgMs: row?.aiMedianish == null ? null : Math.round(Number(row.aiMedianish)),
      };
    },

    /** Index of the player inside the stable display order, used to show surrounding rows. */
    async getDisplayIndex(playerId: string, version = LEVEL_SET_VERSION) {
      const best = await this.getBest(playerId, version);
      if (!best) return null;
      const [row] = await db
        .select({ before: sql<number>`count(*)` })
        .from(bests)
        .where(
          and(
            eq(bests.levelSetVersion, version),
            sql`(${bests.bestLevel} > ${best.bestLevel} OR (${bests.bestLevel} = ${best.bestLevel} AND (${bests.achievedAt} < ${best.achievedAt} OR (${bests.achievedAt} = ${best.achievedAt} AND ${bests.playerId} < ${playerId}))))`,
          ),
        );
      return Number(row?.before ?? 0);
    },
  };
}

export type GameRepository = ReturnType<typeof createGameRepository>;
export type LeaderboardRepository = ReturnType<typeof createLeaderboardRepository>;
