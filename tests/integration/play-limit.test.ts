import { randomUUID } from "node:crypto";
import { nextUtcMidnight, readPlayLimitConfig, utcDay } from "@/core/limits/config";
import { bypassMatches, isPlayerKey, playLimitKey } from "@/core/limits/identity";
import { createSpotTheDifferencePlugin } from "@/games/spot-the-difference/server-plugin";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { createGameService } from "@/server/game-service";
import { createGameRepository, createLeaderboardRepository } from "@/server/repositories/game-repository";
import { createTestDatabase } from "../helpers/test-db";

async function setup(playLimit = { runsPerDay: 3, scope: "per-game" as const }) {
  const { db, cleanup } = await createTestDatabase();
  let clock = Date.UTC(2026, 9, 18, 23, 0, 0);
  const service = createGameService({
    games: createGameRepository(db),
    leaderboard: createLeaderboardRepository(db),
    decisions: new FakeDecisionClient(() => ({ choice: "r1c1" })),
    now: () => clock,
    randomId: () => randomUUID(),
    randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: async () => "data:image/png;base64,AA==" }),
    playLimit,
    maxSessionsPerHour: 100,
  });
  const playerId = (await service.ensurePlayer(null)).id;
  return { service, playerId, cleanup, tick: (ms: number) => (clock += ms), db };
}

test("3 runs per person per UTC day, enforced at session start; resets at 00:00 UTC", async () => {
  const s = await setup();
  try {
    const key = await playLimitKey({ playerKey: randomUUID(), salt: "salt" });
    const first = await s.service.createSession({ playerId: s.playerId, limitKey: key });
    expect(first.playLimit).toMatchObject({ limit: 3, used: 1, remaining: 2 });
    await s.service.createSession({ playerId: s.playerId, limitKey: key });
    const third = await s.service.createSession({ playerId: s.playerId, limitKey: key });
    expect(third.playLimit?.remaining).toBe(0);
    await expect(s.service.createSession({ playerId: s.playerId, limitKey: key })).rejects.toMatchObject({ code: "daily_limit", status: 429 });
    // A different person is unaffected; the bypass (tests) is never counted.
    const other = await playLimitKey({ playerKey: randomUUID(), salt: "salt" });
    expect((await s.service.createSession({ playerId: s.playerId, limitKey: other })).playLimit?.remaining).toBe(2);
    expect((await s.service.createSession({ playerId: s.playerId, limitKey: key, bypassLimit: true })).playLimit).toMatchObject({ bypass: true });
    expect((await s.service.getPlayLimit({ limitKey: key })).remaining).toBe(0);
    // Next UTC day.
    s.tick(60 * 60 * 1000 + 1);
    expect((await s.service.getPlayLimit({ limitKey: key })).remaining).toBe(3);
    expect((await s.service.createSession({ playerId: s.playerId, limitKey: key })).playLimit?.used).toBe(1);
  } finally {
    await s.cleanup();
  }
});

test("the limit is config: 0 disables it", async () => {
  const s = await setup({ runsPerDay: 0, scope: "per-game" });
  try {
    for (let index = 0; index < 5; index += 1) await s.service.createSession({ playerId: s.playerId, limitKey: "k".repeat(64) });
  } finally {
    await s.cleanup();
  }
});

test("only hashes: the key is SHA-256(salt | random player key); a new key is a fresh allowance", async () => {
  const pk = randomUUID();
  const a = await playLimitKey({ playerKey: pk, salt: "s" });
  expect(a).toMatch(/^[a-f0-9]{64}$/);
  expect(a).not.toContain(pk.slice(0, 8));
  expect(await playLimitKey({ playerKey: pk, salt: "s" })).toBe(a);
  expect(await playLimitKey({ playerKey: randomUUID(), salt: "s" })).not.toBe(a);
  expect(await playLimitKey({ playerKey: pk, salt: "other-salt" })).not.toBe(a);
  expect(isPlayerKey(pk)).toBe(true);
  for (const bad of ["", "not-a-uuid", "a".repeat(64), null, undefined]) expect(isPlayerKey(bad)).toBe(false);
});

test("bypass header, UTC day helpers and env config", () => {
  expect(bypassMatches("x".repeat(20), "x".repeat(20))).toBe(true);
  expect(bypassMatches("x".repeat(20), "y".repeat(20))).toBe(false);
  expect(bypassMatches("short", "short")).toBe(false);
  expect(bypassMatches(null, "x".repeat(20))).toBe(false);
  const t = Date.UTC(2026, 9, 18, 23, 59, 0);
  expect(utcDay(t)).toBe("2026-10-18");
  expect(nextUtcMidnight(t)).toBe(Date.UTC(2026, 9, 19));
  expect(readPlayLimitConfig({})).toEqual({ runsPerDay: 3, scope: "per-game" });
  expect(readPlayLimitConfig({ PLAY_LIMIT_RUNS_PER_DAY: "5", PLAY_LIMIT_SCOPE: "global" })).toEqual({ runsPerDay: 5, scope: "global" });
});

