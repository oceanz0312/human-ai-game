// @vitest-environment node
import { randomUUID } from "node:crypto";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { createGameService } from "@/server/game-service";
import { createSpotTheDifferencePlugin } from "@/games/spot-the-difference/server-plugin";
import { getLevelImageSha256 } from "@/server/levels/catalog";
import { createGameRepository, createLeaderboardRepository } from "@/server/repositories/game-repository";
import { ServerTiming } from "@/server/server-timing";
import { createTestDatabase } from "../helpers/test-db";

test("startNextRound does not load level images and uses at most three D1 round-trips", async () => {
  const { db, cleanup } = await createTestDatabase();
  const games = createGameRepository(db);
  const readLevelImage = vi.fn(async (level: number) => `level-${level}`);
  let d1Calls = 0;
  const proxy = new Proxy(games, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function" && ["getOwnedSession", "getOpenRound", "createRound"].includes(String(prop))) {
        return (...args: unknown[]) => {
          d1Calls += 1;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return value;
    },
  });

  const service = createGameService({
    games: proxy,
    leaderboard: createLeaderboardRepository(db),
    decisions: new FakeDecisionClient(async () => ({ choice: "r1c1", latencyMs: 0 })),
    now: () => Date.now(),
    randomId: () => randomUUID(),
    randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: (level) => readLevelImage(level.level) }),
    legacyLevelAssetSha256: getLevelImageSha256,
    decisionsDispatchMode: "worker",
    decisionsWorkerPublicUrl: "https://worker.test",
    decisionsTicketSecret: "test-ticket-secret-with-enough-entropy-1234567890",
  });

  const playerId = randomUUID();
  await games.createPlayer(playerId, Date.now());
  const session = await games.createSession({ id: randomUUID(), playerId, now: Date.now() });

  d1Calls = 0;
  const timing = new ServerTiming();
  const wallStart = performance.now();
  await service.startNextRound(session.id, playerId, timing);
  const wallMs = performance.now() - wallStart;

  expect(readLevelImage).not.toHaveBeenCalled();
  expect(d1Calls).toBeLessThanOrEqual(3);
  expect(wallMs).toBeLessThan(120);
  expect(timing.headerValue()).toMatch(/d1;dur=/);

  await cleanup();
});

test("beginRound signs tickets from precomputed PNG hashes without readLevelImage", async () => {
  const { db, cleanup } = await createTestDatabase();
  const games = createGameRepository(db);
  const readLevelImage = vi.fn(async (level: number) => `level-${level}`);
  const service = createGameService({
    games,
    leaderboard: createLeaderboardRepository(db),
    decisions: new FakeDecisionClient(async () => ({ choice: "r1c1", latencyMs: 0 })),
    now: () => Date.now(),
    randomId: () => randomUUID(),
    randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: (level) => readLevelImage(level.level) }),
    legacyLevelAssetSha256: getLevelImageSha256,
    decisionsDispatchMode: "worker",
    decisionsWorkerPublicUrl: "https://worker.test",
    decisionsTicketSecret: "test-ticket-secret-with-enough-entropy-1234567890",
  });

  const playerId = randomUUID();
  await games.createPlayer(playerId, Date.now());
  const session = await games.createSession({ id: randomUUID(), playerId, now: Date.now() });
  const started = await service.startNextRound(session.id, playerId);
  const begun = await service.beginRound(started.round.id, playerId);

  expect(begun.ai?.mode).toBe("worker");
  expect(readLevelImage).not.toHaveBeenCalled();

  await cleanup();
});
