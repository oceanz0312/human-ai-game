#!/usr/bin/env node
// Read-only product stats from the PROD D1 database (binding DB, name human-ai), real traffic only.
// Usage (wrangler needs node 22): npx -y node@22 scripts/d1-stats.mjs [--days 7] [--include-test] [--json]
// Runs single SELECT statements through `wrangler d1 execute human-ai --remote --json` with the CLOUDFLARE_API_TOKEN
// already in the environment (never printed). Test-traffic rule: scripts/data/test-traffic.json.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregate, assertReadOnly, dayOf, testPlayers } from "./d1-stats-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules/wrangler/bin/wrangler.js");
const DB = "human-ai";

function query(sql) {
  const out = execFileSync(process.execPath, [WRANGLER, "d1", "execute", DB, "--remote", "--json", "--command", assertReadOnly(sql)], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(out.slice(out.indexOf("[")));
  if (!parsed[0]?.success) throw new Error("D1 query failed");
  return parsed[0].results;
}

function mergeTimes(sinceMs) {
  try {
    const out = execFileSync("git", ["log", "origin/main", "--first-parent", `--since=${new Date(sinceMs).toISOString()}`, "--format=%ct"], { cwd: ROOT, encoding: "utf8" });
    return out.split("\n").filter(Boolean).map((s) => Number(s) * 1000);
  } catch {
    return [];
  }
}

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) > 0 && args.includes("--days") ? Number(args[args.indexOf("--days") + 1]) : 7;
const includeTest = args.includes("--include-test");
const rules = JSON.parse(readFileSync(path.join(ROOT, "scripts/data/test-traffic.json"), "utf8"));

// Window: the last `days` calendar days in UTC+8, today included.
const todayStart = Date.parse(`${dayOf(Date.now())}T00:00:00+08:00`);
const since = todayStart - (days - 1) * 86_400_000;

const firstSeen = new Map(query("SELECT player_id AS p, MIN(server_ts) AS ts FROM events WHERE player_id IS NOT NULL GROUP BY player_id").map((r) => [r.p, r.ts]));
for (const r of query("SELECT player_id AS p, MIN(created_at) AS ts FROM sessions GROUP BY player_id")) {
  if (!firstSeen.has(r.p) || r.ts < firstSeen.get(r.p)) firstSeen.set(r.p, r.ts);
}
const sessionOwners = new Map(query("SELECT id, player_id AS p FROM sessions").map((r) => [r.id, r.p]));
const events = query(
  `SELECT e.name, COALESCE(e.player_id, s.player_id) AS player_id, e.session_id, e.server_ts, e.metadata FROM events e LEFT JOIN sessions s ON s.id = e.session_id WHERE e.server_ts >= ${since} ORDER BY e.server_ts`,
);
const excluded = includeTest ? new Map() : testPlayers({ firstSeen, sessionOwners, rules, mergeTimes: mergeTimes(Date.parse(rules.launchAt)) });
const r = aggregate(events, excluded, days);

if (args.includes("--json")) {
  console.log(JSON.stringify({ since: new Date(since).toISOString(), excludedPlayers: Object.fromEntries(excluded), ...r }, null, 2));
  process.exit(0);
}

const activeExcluded = new Set(events.filter((e) => excluded.has(e.player_id)).map((e) => e.player_id));
const reasons = {};
for (const p of activeExcluded) reasons[excluded.get(p)] = (reasons[excluded.get(p)] ?? 0) + 1;
console.log(`D1 ${DB} (prod, read-only) · last ${days} days from ${dayOf(since)} (UTC+8) · ${includeTest ? "ALL traffic (test included)" : "real traffic only"}`);
console.log(`events kept ${r.realEvents}, excluded ${r.excludedEvents} from ${activeExcluded.size} test players ${JSON.stringify(reasons)}`);

const dayList = Array.from({ length: days }, (_, i) => dayOf(since + i * 86_400_000));
const pad = (s, n) => String(s).padStart(n);
const w = Math.max(22, ...r.names.map((n) => n.length));
console.log("\nDaily counts per event (UTC+8)");
console.log("event".padEnd(w) + dayList.map((d) => pad(d.slice(5), 7)).join("") + pad("total", 8));
for (const n of r.names) {
  const row = dayList.map((d) => r.daily[d]?.[n] ?? 0);
  console.log(n.padEnd(w) + row.map((c) => pad(c, 7)).join("") + pad(row.reduce((a, b) => a + b, 0), 8));
}
const f = r.funnel;
console.log("\nFunnel (sessions): game_start → level_shown → run_end");
console.log(`  game_start ${f.game_start_sessions} (players ${f.players_game_start}) → reached a level ${f.started_and_shown} → run_end ${f.started_and_ended}`);
console.log(`  (all sessions with level_shown ${f.level_shown_sessions}, with run_end ${f.run_end_sessions}; includes runs started before the window)`);
console.log(`\nquick_round: ${r.quickRound.rounds} rounds by ${r.quickRound.players} players · by mode ${JSON.stringify(r.quickRound.byMode)} · winner ${JSON.stringify(r.quickRound.byWinner)}`);
console.log(`kw_cta_click: ${r.kwCta.clicks} clicks by ${r.kwCta.players} players · by page ${JSON.stringify(r.kwCta.byPage)}`);
console.log("\nPer landing page (board = themed/demo quick board; game_start attributed to a CTA click ≤2 min earlier)");
console.log("page".padEnd(28) + ["demo_view", "board_start", "hero_cta", "kw_cta", "game_start"].map((h) => pad(h, 12)).join(""));
for (const [page, c] of Object.entries(r.pages).sort((a, b) => b[1].board_start + b[1].game_start_attr - (a[1].board_start + a[1].game_start_attr))) {
  console.log(page.padEnd(28) + [c.demo_view, c.board_start, c.hero_cta_click, c.kw_cta_click, c.game_start_attr].map((v) => pad(v, 12)).join(""));
}
