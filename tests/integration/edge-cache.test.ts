import { randomUUID } from "node:crypto";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { cached, createMemoryEdgeCache, EDGE_TTL } from "@/server/edge-cache";
import { createGameService } from "@/server/game-service";
import { createSpotTheDifferencePlugin } from "@/games/spot-the-difference/server-plugin";
import { getLevelImageSha256, getPrivateLevel } from "@/server/levels/catalog";
import { createGameRepository, createLeaderboardRepository } from "@/server/repositories/game-repository";
import { createTestDatabase } from "../helpers/test-db";

let cleanup: (() => Promise<void> | void) | null = null;
afterEach(async () => {
  await cleanup?.();
  cleanup = null;
});

async function setup() {
  const created = await createTestDatabase();
  cleanup = created.cleanup;
  let clock = 1_000_000;
  const games = createGameRepository(created.db);
  const leaderboard = createLeaderboardRepository(created.db);
  const edgeCache = createMemoryEdgeCache(() => clock);
  const calls = { bundle: 0, rank: 0, list: 0, stats: 0 };
  const countedGames = {
    ...games,
    getResultBundle: (id: string) => ((calls.bundle += 1), games.getResultBundle(id)),
    getResultLive: (id: string) => ((calls.rank += 1), games.getResultLive(id)),
  };
  const countedBoard = {
    ...leaderboard,
    list: (input: Parameters<typeof leaderboard.list>[0]) => ((calls.list += 1), leaderboard.list(input)),
    levelStats: (version?: string) => ((calls.stats += 1), leaderboard.levelStats(version)),
  } as typeof leaderboard;
  const service = createGameService({
    games: countedGames,
    leaderboard: countedBoard,
    edgeCache,
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
  return { service, edgeCache, calls, finishRun, advance: (ms: number) => (clock += ms), player: async () => (await service.ensurePlayer(null)).id };
}

test("cached() stores values but never null/undefined, and honours TTL", async () => {
  let now = 0;
  const cache = createMemoryEdgeCache(() => now);
  let loads = 0;
  const load = async () => ((loads += 1), { n: loads });
  expect(await cached(cache, "k", 10, load)).toEqual({ n: 1 });
  expect(await cached(cache, "k", 10, load)).toEqual({ n: 1 });
  now += 11_000;
  expect(await cached(cache, "k", 10, load)).toEqual({ n: 2 });
  expect(await cached(cache, "missing", 10, async () => null)).toBeNull();
  expect(cache.size()).toBe(1);
  expect(await cached(null, "k", 10, load)).toEqual({ n: 3 });
});

test("a finished result is served from cache; rank refreshes after its minute", async () => {
  const ctx = await setup();
  const a = await ctx.player();
  const b = await ctx.player();
  const publicId = await ctx.finishRun(a, 3);
  const first = await ctx.service.getResultWithOwner(publicId);
  expect(first).toMatchObject({ ownerId: a, view: { rank: 1 } });
  expect(ctx.calls.bundle).toBe(1);
  expect(await ctx.service.getResultWithOwner(publicId)).toEqual(first);
  expect(ctx.calls).toMatchObject({ bundle: 1, rank: 0 });

  // Another player overtakes: within the minute the cached rank stands, after it the rank refreshes with one query.
  await ctx.finishRun(b, 6);
  expect((await ctx.service.getResultWithOwner(publicId))!.view.rank).toBe(1);
  ctx.advance((EDGE_TTL.resultLive + 1) * 1000);
  const later = await ctx.service.getResultWithOwner(publicId);
  expect(later!.view.rank).toBe(2);
  expect(later!.view.reachedLevel).toBe(first!.view.reachedLevel);
  expect(ctx.calls).toMatchObject({ bundle: 1, rank: 1 });
});

test("nickname edits show at once on the owner's fresh read and within the live TTL for everyone else", async () => {
  const ctx = await setup();
  const a = await ctx.player();
  const publicId = await ctx.finishRun(a, 3);
  expect((await ctx.service.getResultWithOwner(publicId))!.view.nickname).toBeNull();
  await ctx.service.setNickname(a, "Bo");
  // Owner's own page: no cached reads.
  const fresh = await ctx.service.getResultWithOwner(publicId, { fresh: true });
  expect(fresh!.view.nickname).toBe("Bo");
  // The fresh read reseeds this colo's entries, so shared views pick the new nickname up right away too.
  expect((await ctx.service.getResultWithOwner(publicId))!.view.nickname).toBe("Bo");
  await ctx.service.setNickname(a, "Cy");
  ctx.advance((EDGE_TTL.resultLive + 1) * 1000);
  const shared = await ctx.service.getResultWithOwner(publicId);
  expect(shared!.view.nickname).toBe("Cy");
  expect(shared!.view.reachedLevel).toBe(fresh!.view.reachedLevel);
});

test("unknown results are not cached (a just-finished run is visible immediately)", async () => {
  const ctx = await setup();
  expect(await ctx.service.getResultWithOwner("b".repeat(22))).toBeNull();
  expect(await ctx.service.getResultWithOwner("b".repeat(22))).toBeNull();
  expect(ctx.calls.bundle).toBe(2);
});

test("the shared board top is cached for 30s, but fresh reads (own view) always hit the database", async () => {
  const ctx = await setup();
  const a = await ctx.player();
  await ctx.finishRun(a, 2);
  await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 50 });
  await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 50 });
  expect(ctx.calls.list).toBe(1);
  const b = await ctx.player();
  await ctx.finishRun(b, 5);
  const fresh = await ctx.service.getLeaderboard({ viewerPlayerId: b, limit: 10, fresh: true });
  expect(fresh.top[0].isMe).toBe(true);
  const stale = await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 50 });
  expect(stale.top).toHaveLength(1);
  ctx.advance((EDGE_TTL.boardTop + 1) * 1000);
  expect((await ctx.service.getLeaderboard({ viewerPlayerId: null, limit: 50 })).top).toHaveLength(2);
});

test("level stats are cached for ten minutes", async () => {
  const ctx = await setup();
  await ctx.service.getLevelStats();
  await ctx.service.getLevelStats();
  expect(ctx.calls.stats).toBe(1);
  ctx.advance((EDGE_TTL.levelStats + 1) * 1000);
  await ctx.service.getLevelStats();
  expect(ctx.calls.stats).toBe(2);
});
