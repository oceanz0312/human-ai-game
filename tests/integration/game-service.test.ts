import { randomUUID } from "node:crypto";
import type { FakeDecisionPlan } from "@/server/decisions/fake";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { GameError } from "@/server/errors";
import { createGameService } from "@/server/game-service";
import { createSpotTheDifferencePlugin } from "@/games/spot-the-difference/server-plugin";
import { getLevelImageSha256, getPrivateLevel } from "@/server/levels/catalog";
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
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: async (level) => `level-${level.level}` }),
    legacyLevelAssetSha256: getLevelImageSha256,
    sleep: async (ms) => {
      clock += ms;
    },
    aiRevealWaitMs: options.aiRevealWaitMs ?? 0,
    decisionsDispatchMode: "fake",
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

test("a complete AI answer persists probabilities and timing for the reveal page", async () => {
  ctx = await setup({
    ai: (level) => ({
      choice: getPrivateLevel(level).correctChoice,
      latencyMs: 42,
      confidence: 0.76,
      probabilities: { [getPrivateLevel(level).correctChoice]: 0.76, r1c1: 0.12 },
    }),
  });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const result = await ctx.playRound(session.id, playerId, "correct", { elapsedMs: 900 });
  expect(result.round.ai).toMatchObject({
    status: "complete",
    choice: getPrivateLevel(1).correctChoice,
    confidence: 0.76,
    probabilities: expect.objectContaining({ r1c1: 0.12 }),
    modelElapsedMs: 42,
    elapsedMs: 42,
  });
  expect(result.round.imageUrl).toBe("/levels/v1/01.png");
  expect(result.round.correctChoice).toBe(getPrivateLevel(1).correctChoice);
});

test("an AI error does not modify lives and is never a speed win", async () => {
  ctx = await setup({ ai: () => ({ errorCode: "upstream_error" }) });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const result = await ctx.playRound(session.id, playerId, "correct");
  expect(result.round.ai).toMatchObject({ status: "error", refused: false });
  expect(result.round.winner).toBe("human");
  expect(result.session).toMatchObject({ lives: 3, fasterThanAiCount: 0 });
});

test("a Decisions refusal is revealed as a refusal and counts as an AI loss", async () => {
  ctx = await setup({ ai: () => ({ errorCode: "refused" }) });
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const won = await ctx.playRound(session.id, playerId, "correct");
  expect(won.round.ai).toMatchObject({ status: "error", refused: true });
  expect(won.round.winner).toBe("human");
  const lost = await ctx.playRound(session.id, playerId, "wrong");
  expect(lost.round.winner).toBe("none");
  expect(lost.session).toMatchObject({ lives: 2, fasterThanAiCount: 0 });
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
  expect(after.round.ai).toMatchObject({
    status: "complete",
    correct: true,
    elapsedMs: 60,
    refused: false,
    choice: getPrivateLevel(1).correctChoice,
    confidence: expect.any(Number),
    probabilities: expect.any(Object),
    modelElapsedMs: 60,
  });
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

test("concurrent duplicate submissions settle once and remove one life", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const started = await ctx.service.startNextRound(session.id, playerId);
  await ctx.service.beginRound(started.round.id, playerId);
  ctx.advance(1000);
  const wrong = getPrivateLevel(1).choices.find((choice) => choice !== getPrivateLevel(1).correctChoice)!;
  const submissions = await Promise.all([1, 2, 3].map(() => ctx.service.submitRound(started.round.id, playerId, { choice: wrong, elapsedMs: 1000 })));
  expect(submissions.map((item) => item.session.lives)).toEqual([2, 2, 2]);
  expect(await ctx.service.getSession(session.id, playerId)).toMatchObject({ level: 2, lives: 2 });
});

test("a late settlement write for an earlier round never overwrites newer progress", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  const first = await ctx.playRound(session.id, playerId, "correct");
  await ctx.playRound(session.id, playerId, "wrong");
  const applied = await ctx.games.submitHumanAnswer({
    roundId: first.roundId,
    status: "incorrect",
    choice: null,
    elapsedMs: 1,
    clientElapsedMs: 1,
    now: Date.now(),
    session: { level: 2, lives: 0, status: "ended", reachedLevel: 1, cleared: false },
    result: { id: "late-result", publicId: "late-public-id-0000000" },
  });
  expect(applied).toBe(false);
  expect(await ctx.service.getSession(session.id, playerId)).toMatchObject({ level: 3, lives: 2, status: "active", publicId: null });
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

test("level stats aggregate settled rounds without exposing answers", async () => {
  ctx = await setup();
  const playerId = await ctx.player();
  const session = await ctx.service.createSession({ playerId });
  await ctx.playRound(session.id, playerId, "correct", { elapsedMs: 900 });
  await ctx.playRound(session.id, playerId, "wrong");
  const stats = await ctx.service.getLevelStats();
  const one = stats.find((row) => row.level === 1)!;
  expect(one).toMatchObject({ level: 1, samples: 1, humanCorrect: 1, aiAnswered: 1, aiCorrect: 1, fastestHumanMs: 900 });
  expect(stats.find((row) => row.level === 2)).toMatchObject({ samples: 1, humanCorrect: 0, fastestHumanMs: null });
  expect(JSON.stringify(stats)).not.toMatch(/r\dc\d/);
});

async function setupServer(latency: (level: number) => number, opts: { errorCode?: "rate_limited" } = {}) {
  const { db, cleanup } = await createTestDatabase();
  let clock = 1_000_000;
  const decisions = new FakeDecisionClient(async (input) => {
    const level = Number(/level-(\d+)/.exec(input.imageDataUrl)?.[1]);
    const ms = latency(level);
    clock += ms;
    return opts.errorCode ? { errorCode: opts.errorCode } : { choice: getPrivateLevel(level).correctChoice };
  });
  const service = createGameService({
    games: createGameRepository(db),
    leaderboard: createLeaderboardRepository(db),
    decisions,
    now: () => clock,
    randomId: () => randomUUID(),
    randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: async (level) => `level-${level.level}` }),
    legacyLevelAssetSha256: getLevelImageSha256,
    sleep: async (ms) => {
      clock += ms;
    },
  });
  const playerId = (await service.ensurePlayer(null)).id;
  const session = await service.createSession({ playerId });
  return { service, playerId, session, cleanup, advance: (ms: number) => (clock += ms) };
}

test("server mode: the AI starts at shownAt, streams real events and its time is measured from shownAt", async () => {
  const s = await setupServer(() => 900);
  try {
    const started = await s.service.startNextRound(s.session.id, s.playerId);
    const { begun, run } = await s.service.beginRoundLive(started.round.id, s.playerId);
    expect(begun.ai).toBeNull();
    const seen: string[] = [];
    run!.subscribe((event) => seen.push(event.event));
    await run!.done;
    expect(seen).toEqual(["image", "sent", "answered"]);
    expect(JSON.stringify(run!.events)).not.toMatch(/r\dc\d|choice|elapsed/);
    // Before the player locks in, the round still hides the AI.
    const hidden = await s.service.getRound(started.round.id, s.playerId);
    expect(hidden.round.ai.status).toBe("running");
    expect(hidden.round.ai.choice).toBeNull();
    expect(hidden.round.correctChoice).toBeNull();
    s.advance(500);
    const level = getPrivateLevel(1);
    const submitted = await s.service.submitRound(started.round.id, s.playerId, { choice: level.correctChoice, elapsedMs: 1400 });
    expect(submitted.round.ai).toMatchObject({ status: "complete", correct: true, elapsedMs: 900 });
  } finally {
    s.cleanup();
  }
});

test("server mode: an AI slower than the level limit is a timeout, and the player still wins", async () => {
  const s = await setupServer((level) => getPrivateLevel(level).limitMs + 100);
  try {
    const started = await s.service.startNextRound(s.session.id, s.playerId);
    const { run } = await s.service.beginRoundLive(started.round.id, s.playerId);
    await run!.done;
    expect(run!.events.at(-1)).toMatchObject({ event: "error", code: "ai_timeout" });
    const submitted = await s.service.submitRound(started.round.id, s.playerId, { choice: getPrivateLevel(1).correctChoice, elapsedMs: 1000 });
    expect(submitted.round.ai).toMatchObject({ status: "error", errorCode: "ai_timeout" });
    expect(submitted.round.winner).toBe("human");
  } finally {
    s.cleanup();
  }
});

test("server mode: a repeated /start does not run the AI twice and reports the final state", async () => {
  const s = await setupServer(() => 300);
  try {
    const started = await s.service.startNextRound(s.session.id, s.playerId);
    const first = await s.service.beginRoundLive(started.round.id, s.playerId);
    await first.run!.done;
    const second = await s.service.beginRoundLive(started.round.id, s.playerId);
    await second.run!.done;
    expect(second.begun.started).toBe(false);
    expect(second.run!.events.map((e) => e.event)).toEqual(["answered"]);
  } finally {
    s.cleanup();
  }
});

describe("one-round-trip result lookup (perf PR-C)", () => {
  async function playRun(playerId: string, answers: Answer[], replay = false) {
    ctx.advance(2 * 60 * 60 * 1000);
    const session = await ctx.service.createSession({ playerId, replay });
    let last: Awaited<ReturnType<typeof ctx.playRound>> | null = null;
    for (const answer of answers) {
      last = await ctx.playRound(session.id, playerId, answer, { elapsedMs: 300 });
      if (last.session.status === "ended") break;
    }
    return last!.session.publicId!;
  }

  async function withLegacy<T>(work: () => Promise<T>) {
    process.env.RESULT_BUNDLE = "off";
    try {
      return await work();
    } finally {
      delete process.env.RESULT_BUNDLE;
    }
  }

  test("the batched bundle returns exactly what the sequential lookups return", async () => {
    // Level 2 errors for the AI (a void cell) so outcomes cover human / ai / none / void.
    ctx = await setup({ ai: (level) => (level === 2 ? { errorCode: "upstream_error" } : level % 3 === 0 ? { choice: "zz" } : { choice: getPrivateLevel(level).correctChoice }) });
    const ids: string[] = [];
    const runs: string[] = [];
    for (let i = 0; i < 4; i += 1) ids.push(await ctx.player());
    runs.push(await playRun(ids[0], ["correct", "correct", "correct", "wrong", "correct", "wrong", "timeout"]));
    runs.push(await playRun(ids[1], ["wrong", "correct", "wrong", "wrong"]));
    runs.push(await playRun(ids[2], ["correct", "correct", "correct", "correct", "wrong", "wrong", "wrong"]));
    // A weaker replay keeps the earlier best (bestLevel > reachedLevel) and shares that best's rank.
    runs.push(await playRun(ids[0], ["wrong", "wrong", "wrong"], true));
    runs.push(await playRun(ids[3], ["timeout", "timeout", "timeout"]));
    for (const publicId of runs) {
      const bundled = await ctx.service.getResultWithOwner(publicId);
      const legacy = await withLegacy(() => ctx.service.getResultWithOwner(publicId));
      expect(bundled, publicId).toEqual(legacy);
      expect(bundled!.view.outcomes!.length).toBe(bundled!.view.played);
    }
    const replayView = (await ctx.service.getResultWithOwner(runs[3]))!.view;
    expect(replayView.bestLevel).toBeGreaterThan(replayView.reachedLevel);
    const kinds = new Set<string>();
    for (const publicId of runs) for (const outcome of (await ctx.service.getResult(publicId))!.outcomes ?? []) kinds.add(outcome);
    expect(kinds.size).toBeGreaterThanOrEqual(2);
    expect(await ctx.service.getResultWithOwner("a".repeat(22))).toBeNull();
    expect((await ctx.service.getResultWithOwner(runs[1]))!.ownerId).toBe(ids[1]);
  });

  test("the viewer's 'around' rows match a brute-force board order", async () => {
    ctx = await setup();
    const ids: string[] = [];
    const reachedPlan = [6, 3, 5, 3, 7, 4, 3, 6, 5, 4];
    for (const reached of reachedPlan) {
      const playerId = await ctx.player();
      ids.push(playerId);
      const answers: Answer[] = [];
      for (let level = 1; level <= reached; level += 1) answers.push(level > reached - 3 ? "wrong" : "correct");
      await playRun(playerId, answers);
    }
    const full = await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 100 });
    const ordered = await ctx.leaderboard.list({ limit: 100, version: "v1" });
    for (const viewer of ids) {
      const board = await ctx.service.getLeaderboard({ viewerPlayerId: viewer, limit: 3 });
      // SQL position (one self-join query) equals the brute-force position in the ordered board.
      const position = await ctx.leaderboard.getDisplayIndex(viewer, "v1");
      expect(position).toBe(ordered.findIndex((row) => row.playerId === viewer));
      const meInTop = board.top.some((row) => row.isMe);
      if (meInTop) {
        expect(board.around).toEqual([]);
        continue;
      }
      // The "around" window is the viewer's neighbour above, the viewer, and the one below, in board order.
      expect(board.around.filter((row) => row.isMe)).toHaveLength(1);
      const meRow = board.around.find((row) => row.isMe)!;
      const expected = full.top.slice(Math.max(0, position! - 1), Math.max(0, position! - 1) + 3).map((row) => [row.rank, row.reachedLevel]);
      expect(board.around.map((row) => [row.rank, row.reachedLevel])).toEqual(expected);
      expect(full.top[position!].reachedLevel).toBe(meRow.reachedLevel);
    }
    expect(await ctx.leaderboard.getDisplayIndex(await ctx.player(), "v1")).toBeNull();
  });
});
