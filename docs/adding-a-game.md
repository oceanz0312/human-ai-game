# Adding a game

The platform is a **game-agnostic core** plus a **thin per-game plugin**. A new "human vs real AI"
game should only need the five things in the plugin; everything else is reused.

## What a game provides (the plugin)

| # | Piece | Where | Interface |
|---|---|---|---|
| 1 | Level data / content (frozen set + version) | `src/games/<slug>/levels*.ts` | `GamePlugin.levels / getLevel / levelSetVersion / totalLevels` |
| 2 | Board + input (renders a level, returns an opaque answer id) | `src/games/<slug>/client-plugin.tsx` | `ClientGamePlugin.Board` (`BoardRenderProps`) |
| 3 | Judge answer | `src/games/<slug>/server-plugin.ts` | `GamePlugin.choices / isValidAnswer / judge / correctAnswer` |
| 4 | Normalized decision task for the AI | `server-plugin.ts` | `GamePlugin.buildDecisionInput` → `DecisionInput { imageDataUrl, choices, task }` |
| 5 | Game copy + SEO | `src/games/<slug>/messages/en.ts`, `src/i18n/pages/*.ts` (`pages.<game>`), `src/games/registry.ts` | message namespace + page dictionary section + `GameEntry` |

Rules for plugins:
- **Answers are opaque strings** to the core. Never put the answer in `toPublicLevel` (the browser gets it before answering).
- **Same task for every model** (fairness): build the prompt once in `buildDecisionInput`; adapters only translate the wire format.
- Server plugin is pure: assets come through injected loaders (ASSETS binding on Cloudflare, filesystem locally, stubs in tests).
- Time limit (`limitMs`) is the same for the human and the AI.

## What the core gives you (do not re-implement)

| Module | Location | Status |
|---|---|---|
| Plugin contracts + registry | `src/core/game-plugin.ts`, `src/core/client-game.ts` | done |
| Session / round lifecycle, chances, levels advance | `src/server/game-service.ts` (takes `deps.game`) | done |
| Server-initiated AI race: AI starts at `shownAt`, hidden answer until lock-in, AI time = `completedAt − shownAt`, AI limit = level limit, late = `ai_timeout` | `game-service.ts` (`beginRoundLive`, `runServerAi`) | done |
| NDJSON AI event stream (`image` / `sent` / `answered` / `error`, never cell or time) | `POST /api/rounds/:id/start`, `api.beginRoundStream` | done |
| Humanized captions / terminal / danmaku from events | `src/game/ai-activity.ts`, `ai-error-copy.ts`, `danmaku-messages.ts` | done |
| Lock-in waiting (“你已锁定 · AI 还在分析 x.xs”), next-round prefetch (AI never pre-run) | `src/components/GameScreen.tsx` (core screen, `game` prop) | done |
| Model adapters + model registry (+ game↔model via `ModelEntry.games`) | `src/models/` | done (only `openai-decisions` live) |
| Daily play limit (fingerprint hash is the identity; IPv4 /24 · IPv6 /48 + UA hash only as fallback; N runs/day, `per-game` or `global`, env `PLAY_LIMIT_RUNS_PER_DAY` / `PLAY_LIMIT_SCOPE`; test bypass header `x-play-limit-bypass`) | `src/core/limits/` (`config`, `identity`, `fingerprint`, `PlayLimit.tsx`), `GET /api/play-limit` | done |
| Opponent select (registry cards, coming-soon greyed, "数据不足" under 30 runs, remembered choice, `?ai=`) | `src/core/opponents/OpponentSelect.tsx`, `GET /api/opponents?game=` | done |
| Per-model + overall leaderboards | `listByModel` / `modelStats` in the leaderboard repo, `?ai=<slug>` on the leaderboard page | done |
| D1: `sessions.game_id/model_id`, `results.game_id/model_id`, `rounds.ai_model_id`, `daily_plays` | `drizzle/0003_models_daily_limit.sql` | done |
| Feel/FX kit (sparks, shake, SFX + mute, chance shatter, 3-2-1 FIGHT, WIN / K.O. banners, COMBO / STREAK) | `src/core/fx/` (`sfx`, `dom`, `Banners`, `MuteToggle`, `result-grid`, `fx.css`) | done — boards mark answer elements with `data-answer="<id>"` so hits land on the right cell |
| Reveal shell (verdict, banner, race bar, terminal, brag card, 下一关 under the board) | `src/components/LevelReveal.tsx` + `ClientGamePlugin.RevealBoard` | done — the game only renders its reveal board |
| Share kit: Wordle-style result grid + 复制战况, single-level brag card | `src/core/share/` (`ResultGrid`, `level-card`), `ResultView.outcomes` | done (run poster `src/lib/poster.ts` is still spot-styled) |
| SEO templates driven by the registry | `src/app/[locale]/games/[game]/{play,leaderboard,levels/[n]}`, `src/games/route-game.ts`, `src/core/seo/level-pages.ts` (`LevelSeoProvider`, registered in `src/games/level-seo.ts`), `/ai-opponents` from the model registry | done — keyword landing pages (`/spot-the-difference` …) and long-form copy stay per game |
| i18n plurals | `{n|level|levels}` in catalog values (`translate`, `fill`) | done; dead-key test keeps catalogs clean |

## Checklist

1. **Registry entry**: add a `GameEntry` to `src/games/registry.ts` with `status: "coming-soon"` first (cards only — no routes, sitemap or JSON-LD). Add the model ids it supports to each `ModelEntry.games` in `src/models/registry.ts`.
2. **Levels**: freeze a level set with a new `levelSetVersion` (a new set = a new leaderboard). Public projection must be answer-free.
3. **Server plugin**: implement `GamePlugin` in `src/games/<slug>/server-plugin.ts`. Register it where the container builds the service (`src/server/container.ts`). Sessions store `game_id` = plugin slug; the daily limit scope follows `PLAY_LIMIT_SCOPE`.
   `<basePath>/play` (opponent select), `/leaderboard` and — if you register a `LevelSeoProvider` — `/levels/[n]` come from the `[game]` templates automatically once the game is live.
4. **Client plugin**: implement `ClientGamePlugin` (`Board`, `RevealBoard`, `title`, `exitPath`, `cardImage`, `publicLevel`, `assetUrls`, `hint`); put `data-answer` on answer elements. Call `onPainted()` only when the level is truly visible: that instant starts both clocks and the server-side AI.
5. **AI task**: return `{ imageDataUrl, choices, task: { name, instructions, choices[{ value, description }] } }`. Verify with a mocked fetch that the adapter body matches. If the Decisions Worker must forward `task`, redeploy it (older builds strip `task` and fall back to the spot-the-difference prompt).
6. **Copy**: zh ids are the Chinese strings. Put game-only ids in `src/games/<slug>/messages/en.ts` and register the catalog in `src/games/messages.ts`; the namespace test fails on overlap with common. Page copy goes in `pages.<gameKey>` of `src/i18n/pages/{zh,en}.ts`. When CJK copy changes run `python3 scripts/subset-pixel-font.py` and `npm run share:samples`.
7. **Tests**: copy `tests/integration/core-plugin.test.ts` (stub “odd-word” game: full run through the core, answer sealed until lock-in, AI judged by the plugin). Add e2e for the board at all 6 viewports (one screen, no scroll).
8. **DB**: no game-specific tables; rounds/sessions are shared. Leaderboards are keyed by `levelSetVersion` (and `model_id` from M2).
9. **Go live**: flip `status` to `live` in the registry, which turns on routes, sitemap, nav, JSON-LD and hreflang.

## Proof

`tests/integration/core-plugin.test.ts` registers a fake second game that plays a full cleared run through
`createGameService` with no core changes, and checks the plugin registry and the normalized task.
