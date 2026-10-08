import { randomUUID } from "node:crypto";
import type { FakeDecisionPlan } from "@/server/decisions/fake";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { GameError } from "@/server/errors";
import { createGameService } from "@/server/game-service";
import { getPrivateLevel, toPublicLevel } from "@/server/levels/catalog";
import { createGameRepository, createLeaderboardRepository } from "@/server/repositories/game-repository";
import { createTestDatabase } from "../helpers/test-db";

type Answer = "correct" | "wrong" | "timeout";

async function setup(options: { ai?: (level: number) => FakeDecisionPlan; aiRevealWaitMs?: number } = {}) {
  const { db, cleanup } = await createTestDatabase();
  let clock = 1_000_000;
  const decisions = new FakeDecisionClient((input) => {
    const level = Number(/level-(\d+)/.exec(input.imageDataUrl)?.[1]);
    return options.ai ? options.ai(level) : { choice: getPrivateLevel(level).correctChoice, latencyMs: 0 };
  });
  const games = createGameRepository(db);
  const leaderboard = createLeaderboardRepository(db);
  const service = createGameService({
    games,
    leaderboard,
    decisions,
    now: () => clock,
    randomId: () => randomUUID(),
    randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
    getLevel: getPrivateLevel,
    toPublicLevel,
    readLevelImage: async (level) => `level-${level}`,
    sleep: async (ms) => {
      clock += ms;
    },
    aiRevealWaitMs: options.aiRevealWaitMs ?? 0,
  });
  const advance = (ms: number) => {
    clock += ms;
  };
  const player = async () => (await service.ensurePlayer(null)).id;

  async function playRound(sessionId: string, playerId: string, answer: Answer, opts: { elapsedMs?: number; runAi?: boolean } = {}) {
    const started = await service.startNextRound(sessionId, playerId);
    await service.beginRound(started.round.id, playerId);
    if (opts.runAi !== false) await service.runAiForRound(started.round.id);
    const level = getPrivateLevel(started.round.level);
    const elapsedMs = opts.elapsedMs ?? 1000;
    advance(answer === "timeout" ? level.limitMs + 2000 : elapsedMs);
    const wrong = level.choices.find((choice) => choice !== level.correctChoice)!;
    const choice = answer === "correct" ? level.correctChoice : answer === "wrong" ? wrong : null;
    const response = await service.submitRound(started.round.id, playerId, { choice, elapsedMs: answer === "timeout" ? level.limitMs : elapsedMs });
    return { ...response, roundId: started.round.id, started };
  }

  return { service, decisions, games, leaderboard, advance, player, playRound, cleanup };
}

let ctx: Awaited<ReturnType<typeof setup>>;
afterEach(() => ctx?.cleanup());

test("a new session starts at level 1 with 3 lives", async () => {
  ctx = await setup();
  const session = await ctx.service.createSession({ playerId: await ctx.player() });
  expect(session).toMatchObject({ level: 1, lives: 3, status: "active", fasterThanAiCount: 0, activeRound: null });
});

test("round start returns public metadata only", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const started = await ctx.service.startNextRound(session.id, playerId);
  expect(started.level).toEqual({ version: "v1", level: 1, gridSize: 3, limitMs: 8000, imageUrl: "/levels/v1/01.png", choices: expect.any(Array) });
  expect(JSON.stringify(started)).not.toContain("correctChoice");
  expect(Object.keys(started.level).sort()).toEqual(["choices", "gridSize", "imageUrl", "level", "limitMs", "version"]);
});

test("an incorrect answer advances and removes one life", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const result = await ctx.playRound(session.id, playerId, "wrong");
  expect(result.round.human?.status).toBe("incorrect");
  expect(result.session).toMatchObject({ level: 2, lives: 2, status: "active" });
});

test("the third failure finalizes the result at that level and updates the leaderboard", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  await ctx.playRound(session.id, playerId, "correct");
  await ctx.playRound(session.id, playerId, "wrong");
  await ctx.playRound(session.id, playerId, "timeout");
  const last = await ctx.playRound(session.id, playerId, "wrong");
  expect(last.session).toMatchObject({ status: "ended", lives: 0, reachedLevel: 4, cleared: false });
  expect(last.session.publicId).toMatch(/^[A-Za-z0-9_-]{22}$/);
  const view = await ctx.service.getResult(last.session.publicId!);
  expect(view).toMatchObject({ reachedLevel: 4, rank: 1, bestLevel: 4 });
  await expect(ctx.service.startNextRound(session.id, playerId)).rejects.toMatchObject({ code: "session_ended" });
});

test("level 20 finalizes the run regardless of remaining lives", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  let last;
  for (let level = 1; level <= 20; level += 1) last = await ctx.playRound(session.id, playerId, "correct", { elapsedMs: 500 });
  expect(last!.session).toMatchObject({ status: "ended", lives: 3, reachedLevel: 20, cleared: true });
});

test("an AI error does not modify lives and is never a speed win", async () => {
  ctx = await setup({ ai: () => ({ errorCode: "upstream_error" }) });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const result = await ctx.playRound(session.id, playerId, "correct");
  expect(result.round.ai.status).toBe("error");
  expect(result.round.winner).toBe("human");
  expect(result.session).toMatchObject({ lives: 3, fasterThanAiCount: 0 });
});

test("a late AI answer updates fasterThanAiCount exactly once and never touches lives", async () => {
  ctx = await setup({ ai: (level) => ({ choice: getPrivateLevel(level).correctChoice, latencyMs: 60 }) });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const result = await ctx.playRound(session.id, playerId, "correct", { runAi: false, elapsedMs: 40 });
  expect(result.round.winner).toBe("pending");
  expect(result.round.ai.correct).toBeNull();
  await Promise.all([ctx.service.runAiForRound(result.roundId), ctx.service.runAiForRound(result.roundId)]);
  await ctx.service.runAiForRound(result.roundId);
  const after = await ctx.service.getRound(result.roundId, playerId);
  expect(after.round.ai).toEqual({ status: "complete", correct: true, elapsedMs: 60 });
  expect(after.round.winner).toBe("human");
  expect(after.round.fasterThanAi).toBe(true);
  expect(after.session).toMatchObject({ fasterThanAiCount: 1, lives: 3, level: 2 });
});

test("a correct AI that is faster wins the level without a faster count", async () => {
  ctx = await setup({ ai: (level) => ({ choice: getPrivateLevel(level).correctChoice, latencyMs: 0 }) });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const result = await ctx.playRound(session.id, playerId, "correct", { elapsedMs: 900 });
  expect(result.round.winner).toBe("ai");
  expect(result.session).toMatchObject({ fasterThanAiCount: 0, lives: 3 });
});

test("a duplicate submission returns the original settlement", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const first = await ctx.playRound(session.id, playerId, "wrong");
  const level = getPrivateLevel(1);
  const again = await ctx.service.submitRound(first.roundId, playerId, { choice: level.correctChoice, elapsedMs: 100 });
  expect(again.round.human).toEqual(first.round.human);
  expect(again.session.lives).toBe(2);
});

test("concurrent AI runs claim one lease and invoke the Worker once", async () => {
  ctx = await setup({ ai: (level) => ({ choice: getPrivateLevel(level).correctChoice, latencyMs: 20 }) });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const started = await ctx.service.startNextRound(session.id, playerId);
  await ctx.service.beginRound(started.round.id, playerId);
  await Promise.all([ctx.service.runAiForRound(started.round.id), ctx.service.runAiForRound(started.round.id), ctx.service.runAiForRound(started.round.id)]);
  expect(ctx.decisions.calls).toHaveLength(1);
});

test("submissions require a started round owned by the player", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const intruder = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const started = await ctx.service.startNextRound(session.id, playerId);
  await expect(ctx.service.submitRound(started.round.id, playerId, { choice: "r1c1", elapsedMs: 100 })).rejects.toMatchObject({ code: "round_not_started" });
  await expect(ctx.service.submitRound(started.round.id, intruder, { choice: "r1c1", elapsedMs: 100 })).rejects.toBeInstanceOf(GameError);
  await expect(ctx.service.getSession(session.id, intruder)).rejects.toMatchObject({ code: "not_found" });
  await ctx.service.beginRound(started.round.id, playerId);
  await expect(ctx.service.submitRound(started.round.id, playerId, { choice: "r9c9", elapsedMs: 100 })).rejects.toMatchObject({ code: "invalid_choice" });
});

test("stalling past the server deadline is a timeout even when the client claims a fast answer", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const started = await ctx.service.startNextRound(session.id, playerId);
  await ctx.service.beginRound(started.round.id, playerId);
  ctx.advance(30_000);
  const result = await ctx.service.submitRound(started.round.id, playerId, { choice: getPrivateLevel(1).correctChoice, elapsedMs: 300 });
  expect(result.round.human?.status).toBe("timeout");
  expect(result.session.lives).toBe(2);
});

test("a level already shown cannot be restarted after a refresh", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const started = await ctx.service.startNextRound(session.id, playerId);
  expect((await ctx.service.startNextRound(session.id, playerId)).round.id).toBe(started.round.id);
  await ctx.service.beginRound(started.round.id, playerId);
  await expect(ctx.service.startNextRound(session.id, playerId)).rejects.toMatchObject({ code: "round_in_progress" });
  const snapshot = await ctx.service.getSession(session.id, playerId);
  expect(snapshot.activeRound).toEqual({ id: started.round.id, level: 1, shown: true });
});

test("session creation is rate limited per player", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  for (let index = 0; index < 40; index += 1) await ctx.service.createSession({ playerId });
  await expect(ctx.service.createSession({ playerId })).rejects.toMatchObject({ code: "too_many_requests" });
});

test("the leaderboard ranks only by best level with ties sharing a rank", async () => {
  ctx = await setup();
  const ids: string[] = [];
  for (const reached of [20, 10, 10, 8]) {
    const playerId = await ctx.player();
    ids.push(playerId);
    const session = await ctx.service.createSession({ playerId });
    for (let level = 1; level <= reached; level += 1) {
      const fail = level >= reached - 2 && reached < 20;
      await ctx.playRound(session.id, playerId, fail ? "wrong" : "correct", { elapsedMs: 200 });
    }
  }
  const board = await ctx.service.getLeaderboard({ viewerPlayerId: ids[2], limit: 10 });
  expect(board.top.map((row) => [row.rank, row.reachedLevel])).toEqual([
    [1, 20],
    [2, 10],
    [2, 10],
    [4, 8],
  ]);
  expect(board.top[2].isMe).toBe(true);

  const replay = await ctx.service.createSession({ playerId: ids[3], replay: true });
  for (let level = 1; level <= 3; level += 1) await ctx.playRound(replay.id, ids[3], "wrong");
  expect(await ctx.leaderboard.getRankForPlayer(ids[3])).toEqual({ rank: 4, reachedLevel: 8 });
});
