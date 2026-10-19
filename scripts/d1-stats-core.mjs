// Pure helpers for scripts/d1-stats.mjs (unit-tested in tests/unit/d1-stats.test.ts). No I/O here.
export const TZ_OFFSET_MS = 8 * 3600_000; // report days in UTC+8 (Asia/Shanghai)
export const dayOf = (ts) => new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10);

/** Only plain SELECT statements may reach `wrangler d1 execute --remote`. */
export function assertReadOnly(sql) {
  const s = sql.trim().replace(/;\s*$/, "");
  if (!/^select\b/i.test(s) || s.includes(";") || /\b(insert|update|delete|drop|alter|create|replace|pragma|attach|vacuum)\b/i.test(s)) {
    throw new Error("d1-stats only runs single SELECT statements");
  }
  return s;
}

/**
 * Set of player ids that are our own test traffic (rule documented in scripts/data/test-traffic.json).
 * firstSeen: Map playerId → first-ever event ts. sessionOwners: Map sessionId → playerId. mergeTimes: ms timestamps.
 */
export function testPlayers({ firstSeen, sessionOwners, rules, mergeTimes = [] }) {
  const out = new Map(); // playerId → reason
  const launch = Date.parse(rules.launchAt);
  const windows = (rules.windows ?? []).map((w) => [Date.parse(w.from), Date.parse(w.to), w.why]);
  const mergeMs = (rules.mergeWindowMinutes ?? 0) * 60_000;
  for (const id of rules.playerIds ?? []) out.set(id, "listed player");
  for (const sid of rules.sessionIds ?? []) {
    const p = sessionOwners.get(sid);
    if (p && !out.has(p)) out.set(p, "listed live-E2E session");
  }
  for (const [p, ts] of firstSeen) {
    if (out.has(p)) continue;
    if (ts < launch) out.set(p, "pre-launch");
    else if (windows.some(([a, b]) => ts >= a && ts <= b)) out.set(p, "test window");
    else if (mergeMs && mergeTimes.some((m) => ts >= m && ts <= m + mergeMs)) out.set(p, "post-merge window");
  }
  return out;
}

const meta = (e) => {
  try {
    return e.metadata ? JSON.parse(e.metadata) : {};
  } catch {
    return {};
  }
};

/** Aggregates real-traffic events. events: { name, player_id, session_id, server_ts, metadata }[] (player_id already resolved). */
export function aggregate(events, exclude, days) {
  const real = events.filter((e) => !(e.player_id && exclude.has(e.player_id)));
  const daily = {}; // day → name → count
  const names = new Set();
  for (const e of real) {
    const d = dayOf(e.server_ts);
    names.add(e.name);
    ((daily[d] ??= {})[e.name] ??= 0);
    daily[d][e.name] += 1;
  }
  const uniq = (name, key) => new Set(real.filter((e) => e.name === name && e[key]).map((e) => e[key])).size;
  const sessionsWith = (name) => new Set(real.filter((e) => e.name === name && e.session_id).map((e) => e.session_id));
  const started = sessionsWith("game_start");
  const shown = sessionsWith("level_shown");
  const ended = sessionsWith("run_end");
  const funnel = {
    level_shown_sessions: shown.size,
    game_start_sessions: started.size,
    started_and_shown: [...started].filter((s) => shown.has(s)).length,
    started_and_ended: [...started].filter((s) => ended.has(s)).length,
    run_end_sessions: ended.size,
    players_game_start: uniq("game_start", "player_id"),
  };
  const quick = real.filter((e) => e.name === "quick_round").map(meta);
  const quickRound = {
    rounds: quick.length,
    players: uniq("quick_round", "player_id"),
    byMode: countBy(quick, (m) => m.mode ?? "?"),
    byWinner: countBy(quick, (m) => m.winner ?? "?"),
  };
  const kw = real.filter((e) => e.name === "kw_cta_click").map(meta);
  const kwCta = { clicks: kw.length, players: uniq("kw_cta_click", "player_id"), byPage: countBy(kw, (m) => m.page ?? "?") };
  // Per landing page: themed/demo board starts (board_start.page) and 20-level CTA clicks (hero/kw_cta_click.page),
  // plus game_starts attributed to the page of the same player's CTA click within the preceding 2 minutes.
  const pages = {};
  const bump = (page, k) => (((pages[page ?? "?"] ??= { demo_view: 0, board_start: 0, quick_round: 0, hero_cta_click: 0, kw_cta_click: 0, game_start_attr: 0 })[k] += 1));
  const clicks = [];
  for (const e of real) {
    const m = meta(e);
    if (e.name === "demo_view" || e.name === "board_start") bump(m.page, e.name);
    if (e.name === "hero_cta_click" || e.name === "kw_cta_click") {
      bump(m.page, e.name);
      clicks.push({ p: e.player_id, ts: e.server_ts, page: m.page });
    }
  }
  for (const e of real.filter((x) => x.name === "game_start")) {
    const c = clicks.filter((k) => k.p === e.player_id && k.ts <= e.server_ts && e.server_ts - k.ts <= 120_000).sort((a, b) => b.ts - a.ts)[0];
    bump(c ? c.page : "(no CTA click)", "game_start_attr");
  }
  return { days, names: [...names].sort(), daily, funnel, quickRound, kwCta, pages, realEvents: real.length, excludedEvents: events.length - real.length };
}

function countBy(rows, f) {
  const o = {};
  for (const r of rows) o[f(r)] = (o[f(r)] ?? 0) + 1;
  return o;
}
