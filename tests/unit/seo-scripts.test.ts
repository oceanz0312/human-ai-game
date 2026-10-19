import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
// @ts-expect-error plain ESM script without types
import { buildPayload, parseSitemapLocs, config } from "../../scripts/indexnow-submit.mjs";
// @ts-expect-error plain ESM script without types
import { aggregate, assertReadOnly, dayOf, testPlayers } from "../../scripts/d1-stats-core.mjs";

describe("IndexNow", () => {
  test("key is 32 hex chars and public/<key>.txt contains exactly the key", () => {
    expect(config.key).toMatch(/^[0-9a-f]{32}$/);
    const file = path.join(process.cwd(), "public", `${config.key}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(config.key);
    expect(config.keyLocation).toBe(`https://${config.host}/${config.key}.txt`);
  });

  test("payload keeps unique URLs on our host only", () => {
    const xml = `<urlset><url><loc>https://spotthedifferencegame.com/</loc></url><url><loc> https://spotthedifferencegame.com/easy </loc></url><url><loc>https://spotthedifferencegame.com/</loc></url><url><loc>https://evil.example/x</loc></url></urlset>`;
    const p = buildPayload(parseSitemapLocs(xml));
    expect(p).toEqual({ host: config.host, key: config.key, keyLocation: config.keyLocation, urlList: ["https://spotthedifferencegame.com/", "https://spotthedifferencegame.com/easy"] });
  });
});

describe("d1-stats", () => {
  test("only single SELECT statements are allowed", () => {
    expect(assertReadOnly("SELECT 1;")).toBe("SELECT 1");
    for (const bad of ["DELETE FROM events", "SELECT 1; DROP TABLE events", "UPDATE events SET name='x'", "PRAGMA table_list"]) {
      expect(() => assertReadOnly(bad)).toThrow();
    }
  });

  test("days are reported in UTC+8", () => {
    expect(dayOf(Date.parse("2026-10-18T16:30:00Z"))).toBe("2026-10-19");
  });

  test("test players: pre-launch, listed sessions, windows, post-merge", () => {
    const rules = {
      launchAt: "2026-10-18T17:08:00+08:00",
      mergeWindowMinutes: 20,
      playerIds: ["p-listed"],
      sessionIds: ["s-e2e"],
      windows: [{ from: "2026-10-19T10:30:00+08:00", to: "2026-10-19T11:00:00+08:00" }],
    };
    const firstSeen = new Map([
      ["p-old", Date.parse("2026-10-17T12:00:00+08:00")],
      ["p-e2e", Date.parse("2026-10-19T09:00:00+08:00")],
      ["p-win", Date.parse("2026-10-19T10:45:00+08:00")],
      ["p-merge", Date.parse("2026-10-19T12:10:00+08:00")],
      ["p-real", Date.parse("2026-10-19T15:00:00+08:00")],
    ]);
    const out = testPlayers({ firstSeen, sessionOwners: new Map([["s-e2e", "p-e2e"]]), rules, mergeTimes: [Date.parse("2026-10-19T12:00:00+08:00")] });
    expect(Object.fromEntries(out)).toEqual({ "p-listed": "listed player", "p-e2e": "listed live-E2E session", "p-old": "pre-launch", "p-win": "test window", "p-merge": "post-merge window" });
  });

  test("aggregate drops test players and attributes game_start to the CTA page", () => {
    const t = Date.parse("2026-10-19T15:00:00+08:00");
    const ev = (name: string, p: string, dt: number, metadata?: object, s?: string) => ({ name, player_id: p, session_id: s ?? null, server_ts: t + dt, metadata: metadata ? JSON.stringify(metadata) : null });
    const r = aggregate(
      [
        ev("board_start", "real", 0, { page: "/easy" }),
        ev("quick_round", "real", 1000, { mode: "easy", winner: "you" }),
        ev("kw_cta_click", "real", 2000, { page: "/easy" }),
        ev("game_start", "real", 3000, undefined, "s1"),
        ev("level_shown", "real", 3100, undefined, "s1"),
        ev("run_end", "real", 9000, undefined, "s1"),
        ev("game_start", "bot", 0, undefined, "s2"),
      ],
      new Map([["bot", "test window"]]),
      7,
    );
    expect(r.excludedEvents).toBe(1);
    expect(r.funnel).toMatchObject({ game_start_sessions: 1, started_and_shown: 1, started_and_ended: 1 });
    expect(r.kwCta).toEqual({ clicks: 1, players: 1, byPage: { "/easy": 1 } });
    expect(r.pages["/easy"]).toMatchObject({ board_start: 1, kw_cta_click: 1, game_start_attr: 1 });
    expect(r.daily["2026-10-19"].quick_round).toBe(1);
  });
});
