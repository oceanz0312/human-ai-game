import { randomUUID } from "node:crypto";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { createGameService } from "@/server/game-service";
import { createSpotTheDifferencePlugin } from "@/games/spot-the-difference/server-plugin";
import { getLevelImageSha256, getPrivateLevel } from "@/server/levels/catalog";
import { createGameRepository, createLeaderboardRepository } from "@/server/repositories/game-repository";
import { createTestDatabase } from "../helpers/test-db";

// CF-2: D1 read replicas. The "replica" here is a second, empty database: the worst case of replication lag.
const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
  delete process.env.D1_REPLICA;
});

async function setup() {
  const primaryDb = await createTestDatabase();
  const replicaDb = await createTestDatabase();
  cleanups.push(primaryDb.cleanup, replicaDb.cleanup);
  let clock = 1_000_000;
  const calls = { replicaBundle: 0, primaryBundle: 0, replicaList: 0, replicaStats: 0 };
  const games = createGameRepository(primaryDb.db);
  const leaderboard = createLeaderboardRepository(primaryDb.db);
  const replicaGames = createGameRepository(replicaDb.db);
  const replicaBoard = createLeaderboardRepository(replicaDb.db);
  const service = createGameService({
    games: { ...games, getResultBundle: (id: string) => ((calls.primaryBundle += 1), games.getResultBundle(id)) },
    leaderboard,
    edgeCache: null,
    replica: () => ({
      games: { getResultBundle: (id: string) => ((calls.replicaBundle += 1), replicaGames.getResultBundle(id)), getResultLive: replicaGames.getResultLive },
      leaderboard: {
        list: (input: Parameters<typeof replicaBoard.list>[0]) => ((calls.replicaList += 1), replicaBoard.list(input)),
        levelStats: (version?: string) => ((calls.replicaStats += 1), replicaBoard.levelStats(version)),
      },
    }),
    decisions: new FakeDecisionClient((input) => ({ choice: getPrivateLevel(Number(/level-(\d+)/.exec(input.imageDataUrl)?.[1])).correctChoice, latencyMs: 0 })),
    now: () => clock,
    randomId: () => randomUUID(),
    randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: async (level) => `level-${level.level}` }),
    legacyLevelAssetSha256: getLevelImageSha256,
    sleep: async (ms) => {
      clock += ms;
    },
    aiRevealWaitMs: 0,
    decisionsDispatchMode: "fake",
  });
  async function finishRun(playerId: string, correctFirst: number) {
    const session = await service.createSession({ playerId, replay: true });
    let publicId: string | null = null;
    for (let i = 0; i < 40 && !publicId; i += 1) {
      const started = await service.startNextRound(session.id, playerId);
      await service.beginRound(started.round.id, playerId);
      await service.runAiForRound(started.round.id);
      const level = getPrivateLevel(started.round.level);
      clock += 500;
      const wrong = level.choices.find((choice) => choice !== level.correctChoice)!;
      const response = await service.submitRound(started.round.id, playerId, { choice: i < correctFirst ? level.correctChoice : wrong, elapsedMs: 500 });
      publicId = response.session.publicId ?? null;
    }
    return publicId!;
  }
  const player = async () => (await service.ensurePlayer(null)).id;
  return { service, calls, finishRun, player };
}

test("the whole run (writes, rounds, finish) runs on the primary; the replica sees nothing", async () => {
  const ctx = await setup();
  const a = await ctx.player();
  const publicId = await ctx.finishRun(a, 4);
  expect(publicId).toBeTruthy();
  expect(ctx.calls.replicaBundle).toBe(0);
});

test("a just-finished run is correct immediately: owner reads the primary, shared views fall back to it on a replica miss", async () => {
  const ctx = await setup();
  const a = await ctx.player();
  const publicId = await ctx.finishRun(a, 4);
  const owner = await ctx.service.getResultWithOwner(publicId, { fresh: true });
  expect(owner).toMatchObject({ ownerId: a, view: { publicId, rank: 1 } });
  expect(ctx.calls).toMatchObject({ replicaBundle: 0, primaryBundle: 1 });
  const shared = await ctx.service.getResultWithOwner(publicId);
  expect(shared).toEqual(owner);
  expect(ctx.calls).toMatchObject({ replicaBundle: 1, primaryBundle: 2 });
  expect(await ctx.service.getResultWithOwner("z".repeat(22))).toBeNull();
});

test("public board top and level stats read the replica; the viewer's fresh board reads the primary", async () => {
  const ctx = await setup();
  const a = await ctx.player();
  await ctx.finishRun(a, 2);
  const shared = await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 10 });
  expect(shared.top).toHaveLength(0);
  expect(ctx.calls.replicaList).toBe(1);
  const fresh = await ctx.service.getLeaderboard({ viewerPlayerId: a, limit: 10, fresh: true });
  expect(fresh.top[0]).toMatchObject({ isMe: true, rank: 1 });
  expect(ctx.calls.replicaList).toBe(1);
  await ctx.service.getLevelStats();
  expect(ctx.calls.replicaStats).toBe(1);
});

test("D1_REPLICA=off sends every read to the primary", async () => {
  const ctx = await setup();
  process.env.D1_REPLICA = "off";
  const a = await ctx.player();
  await ctx.finishRun(a, 2);
  expect((await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 10 })).top).toHaveLength(1);
  await ctx.service.getLevelStats();
  expect(ctx.calls).toMatchObject({ replicaList: 0, replicaStats: 0, replicaBundle: 0 });
});
