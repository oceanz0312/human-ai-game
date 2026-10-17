import { randomUUID } from "node:crypto";
import { nextUtcMidnight, readPlayLimitConfig, utcDay } from "@/core/limits/config";
import { bypassMatches, playLimitKey } from "@/core/limits/identity";
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
    const key = await playLimitKey({ fingerprint: "a".repeat(64), ip: "203.0.113.9", userAgent: "UA", salt: "salt" });
    const first = await s.service.createSession({ playerId: s.playerId, limitKey: key });
    expect(first.playLimit).toMatchObject({ limit: 3, used: 1, remaining: 2 });
    await s.service.createSession({ playerId: s.playerId, limitKey: key });
    const third = await s.service.createSession({ playerId: s.playerId, limitKey: key });
    expect(third.playLimit?.remaining).toBe(0);
    await expect(s.service.createSession({ playerId: s.playerId, limitKey: key })).rejects.toMatchObject({ code: "daily_limit", status: 429 });
    // A different person is unaffected; the bypass (tests) is never counted.
    const other = await playLimitKey({ fingerprint: "b".repeat(64), ip: "203.0.113.9", userAgent: "UA", salt: "salt" });
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

test("only hashes: keys never contain the fingerprint, IP or UA; fp and IP are combined", async () => {
  const fp = "c".repeat(64);
  const a = await playLimitKey({ fingerprint: fp, ip: "198.51.100.1", userAgent: "UA", salt: "s" });
  const b = await playLimitKey({ fingerprint: fp, ip: "198.51.101.2", userAgent: "UA", salt: "s" });
  const noFp = await playLimitKey({ fingerprint: null, ip: "198.51.100.1", userAgent: "UA", salt: "s" });
  expect(a).toMatch(/^[a-f0-9]{64}$/);
  expect(a).not.toBe(b);
  expect(noFp).not.toBe(a);
  for (const key of [a, b, noFp]) expect(key).not.toContain("198.51");
  expect(await playLimitKey({ fingerprint: "not-a-hash", ip: "198.51.100.1", userAgent: "UA", salt: "s" })).toBe(noFp);
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

test("rotating addresses inside one network prefix keep the same person key", async () => {
  const { networkPrefix } = await import("@/core/limits/identity");
  expect(networkPrefix("2a04:4e41:80:3622::679f:3622")).toBe("2a04:4e41:80::/48");
  expect(networkPrefix("2a04:4e41:0080:f8ea::9f9b:f8ea")).toBe("2a04:4e41:80::/48");
  expect(networkPrefix("203.0.113.7")).toBe("203.0.113.0/24");
  expect(networkPrefix("::ffff:203.0.113.9")).toBe("203.0.113.0/24");
  const fp = "a".repeat(64);
  const a = await playLimitKey({ fingerprint: fp, ip: "2a04:4e41:80:3622::679f:3622", userAgent: null, salt: "s" });
  const b = await playLimitKey({ fingerprint: fp, ip: "2a04:4e41:80:707e::6765:707e", userAgent: null, salt: "s" });
  const other = await playLimitKey({ fingerprint: fp, ip: "198.51.100.4", userAgent: null, salt: "s" });
  expect(a).toBe(b);
  expect(a).not.toBe(other);
});
