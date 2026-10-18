# HUMAN / AI

移动端 H5 视觉闯关游戏：玩家与 OpenAI Decisions API 同时寻找网格中唯一不同的图案，提交后比较正确性与真实耗时。

- [完整游戏设计](docs/superpowers/specs/2026-10-08-human-vs-ai-vision-game-design.md)
- [实施计划](docs/superpowers/plans/2026-10-08-human-vs-ai-vision-game.md)
- [视觉规范](docs/design/visual-style.md)
- [发布检查清单](docs/release-checklist.md)
- [交接文档](docs/handover.md)（线上资源、部署、密钥轮换、已知问题、待办）

## 架构

```text
浏览器 H5 ──同源 /api/*──▶ Next.js 游戏服务
     │                           │
     │  一次性 ticket            │  D1 / 排行榜 / 结算（权威 AI 结果）
     └──▶ Decisions Worker ──▶ OpenAI POST /v1/decisions
              │  Service Binding 回调 /api/internal/ai-result
              └──▶ 游戏服务持久化 AI 答案
```

线上两者都部署在 Cloudflare Workers。生产环境中 **浏览器** 在 DevTools Network 里能看到对 Decisions Worker 的 `POST /v1/decide-ticket`；OpenAI Key 仍只在 Worker Secret 中。Worker 把完整 AI 结果通过 Service Binding 写回游戏服务，浏览器响应 **不含** AI 选择的格子（揭晓仍来自同源 `/api/rounds/:id/submit`）。

| 目录 | 职责 |
|---|---|
| `src/game` | 纯规则：生命、推进、胜负、速度对比、服务端耗时校准、揭晓文案 |
| `src/server/levels` | 冻结的 v1 关卡表（含答案，仅服务端与脚本可读） |
| `src/levels/public-catalog.generated.ts` | 生成的公开关卡元数据（不含答案） |
| `src/server/repositories` | 持久层（原子批量语句，兼容 D1）：AI 租约、一次性结算、原子最好成绩、并列排名 |
| `src/server/game-service.ts` | 应用服务：会话、开局、AI 调度、提交结算 |
| `src/server/decisions` | Worker 线协议（与 Worker 共用）、服务端 Worker 客户端、测试用假客户端 |
| `workers/decisions` | 唯一持有 `OPENAI_API_KEY` 的 Cloudflare Worker |
| `src/components`、`src/app` | H5 页面：首页、游戏、揭晓、结算、分享落地页、海报 |
| `scripts` | 关卡出图、关卡校验、数据库迁移 |

### 单关时序

1. `POST /api/sessions/:id/rounds` 创建（或复用尚未展示的）本关，返回不含答案的公开数据；客户端预加载图片。
2. 图片完成首次绘制时，客户端开始本地计时，并调用 `POST /api/rounds/:id/start`：服务端记录展示时刻与截止时间，签发 **一次性短效 ticket**（绑定 session、round、关卡、图片 SHA256、候选格），并返回 `ai: { mode: "worker", url, ticket }`（本地/E2E 为 `mode: "fake"` 的同源 `/api/rounds/:id/ai-fake`）。
3. 客户端立刻按 dispatch 发起 AI 请求（Network 可见）。Decisions Worker 校验 ticket、在 D1 表 `decision_ticket_uses` 中单次消费、从 `PUBLIC_BASE_URL` 拉取关卡图并校验哈希，再调用 OpenAI；结果经 Service Binding `POST /api/internal/ai-result` 写入游戏服务。
4. 玩家点击或倒计时归零后锁定答案，`POST /api/rounds/:id/submit` 幂等提交。结算与胜负 **只** 使用服务端已持久化的 AI 数据。
5. AI 晚到时揭晓页显示「AI 仍在判断」，客户端轮询 `GET /api/rounds/:id` 补齐；揭晓页 **手动** 点「下一关」（无自动跳转）。

**防作弊取舍**：浏览器能提前看到 AI 请求与响应时间戳，但 Worker 响应体不包含 `choice`；即使篡改 Network 响应，也无法改变 D1 里由 Worker 回调写入的 authoritative 答案。玩家在关内仍无法从 Network 直接读到 AI 选了哪一格。

## 本地开发

需要 Node.js 22+。

```bash
npm install
cp .env.example .env.local   # 不配置 DECISIONS_WORKER_URL 时，开发环境自动使用本地假 AI
npm run dev                  # http://localhost:3000，首次请求自动执行数据库迁移
```

本地假 AI 仅用于无 OpenAI 权限时联调：它按图片哈希识别关卡，固定在第 9/13/17/19/20 关答错，耗时随关卡增长。生产环境默认不会启用它；未配置 Worker 时 AI 一律显示「AI 掉线」。

### 环境变量

| 变量 | 位置 | 说明 |
|---|---|---|
| `DECISIONS_WORKER_URL` | 游戏服务 | Decisions Worker 公网地址（写入 begin 响应，供浏览器 CORS 调用） |
| `DECISIONS_WORKER_SHARED_SECRET` | 游戏服务 + Worker | Ticket HMAC 与 Worker→游戏内部回调 Bearer，≥32 字节随机值 |
| `DECISIONS_MODE` | 游戏服务 | `worker` / `fake` / `off`，默认按上文自动选择 |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | 游戏服务 | LibSQL 地址（本地 `file:./local.db`，线上可用 Turso） |
| `RESULT_SIGNING_SECRET` | 游戏服务 | 签名匿名玩家 Cookie，生产必填 |
| `PUBLIC_BASE_URL` | 游戏服务 | 分享链接与二维码使用的公网地址 |
| `OPENAI_API_KEY` | 仅 Worker Secret | 永远不进入游戏服务、H5 包或浏览器请求 |
| `OPENAI_DECISIONS_MODEL` / `OPENAI_DECISIONS_TIMEOUT_MS` | Worker vars | 默认 `gpt-6-luna` / `8000` |
| `PUBLIC_BASE_URL` | Worker vars | CORS 允许来源 + Worker 拉取 `/levels/v1/*.png` 的基准 URL（与游戏服务一致） |

### 常用命令

```bash
npm run levels:generate   # 由 src/server/levels/spec.ts 重新出图并生成公开目录
npm run levels:validate   # 校验 20 关、候选数、唯一答案、图片尺寸、公开目录不泄露答案
npm run db:generate       # 修改 schema 后生成迁移
npm run db:migrate        # 手动迁移 DATABASE_URL
npm run lint && npm run typecheck && npm run worker:typecheck
npm test                  # 规则、关卡、服务集成、Worker 契约
npm run test:e2e          # 构建后以假 AI 跑移动端 E2E，并在 375/390/430 三个视口截图
```

E2E 截图输出到 `test-results/screens/<视口>/`。

## Cloudflare Worker

```bash
cp workers/decisions/.dev.vars.example workers/decisions/.dev.vars   # 填入 OPENAI_API_KEY 与共享密钥
npm run worker:dev

npx wrangler secret put OPENAI_API_KEY --config workers/decisions/wrangler.jsonc --env preview
npx wrangler secret put DECISIONS_WORKER_SHARED_SECRET --config workers/decisions/wrangler.jsonc --env preview
npm run worker:deploy:preview
```

正式环境去掉 `--env preview` 并使用 `npm run worker:deploy`。账号需要具备 Decisions API 访问权限。

轮换共享密钥：先给 Worker 写入新密钥并部署，再更新游戏服务的 `DECISIONS_WORKER_SHARED_SECRET` 并重启；期间的 AI 请求会表现为「AI 掉线」，不影响玩家结算。

## 游戏服务部署（Cloudflare Workers + D1）

配置在根目录 `wrangler.jsonc`：D1 绑定 `DB`、静态资源 `ASSETS`（服务端也从这里读关卡图）。Decisions Worker 另绑定同一 D1（ticket 单次消费）与 `GAME` Service Binding（回调游戏服务）。游戏服务上的 `DECISIONS` Service Binding 仍保留，供集成测试与服务端 `/v1/decide` 兼容路径使用。

```bash
npx wrangler d1 create human-ai                                   # 首次：把返回的 database_id 写入 wrangler.jsonc
npm run cf:db:migrate                                             # 对线上 D1 执行 drizzle/ 下的迁移
npx wrangler secret put DECISIONS_WORKER_SHARED_SECRET            # 与 Decisions Worker 相同
npx wrangler secret put RESULT_SIGNING_SECRET
npm run cf:deploy                                                 # OpenNext 构建并部署
```

- 线上只用 D1，不在请求时迁移；改 schema 后先 `npm run db:generate`，再 `npm run cf:db:migrate`。
- D1 不支持交互式事务，持久层的多语句写入全部是 `db.batch`，并用条件更新保证重复提交无副作用；不要在仓储层引入 `db.transaction`。
- `patches/` 里的补丁（`postinstall` 自动应用）让 OpenNext 把 Next 16.4 新增的 `preview-props.json` 打进 Worker，否则线上所有请求 500。升级 `@opennextjs/cloudflare` 后先确认上游是否已修复。
- 本地用 `npm run cf:preview` 在 workerd 中预览构建产物；日常开发仍是 `npm run dev` + LibSQL。

## 关卡版本

关卡集合由 `levelSetVersion` 标识（当前 `v1`）。正式发布后不得修改 v1 的图片、答案、位置或时限；如需调整难度，新增关卡版本并使用独立排行榜。

## 实现中确定的方案细节

文档之间有几处口径不一致，实现时统一如下：

- 一期接入了 LibSQL 持久化，因此结算页同时展示「比 AI 更快」「全服排名」「个人最佳」，不再只展示「本机最佳」。
- AI 判断在图片首次绘制后由服务端触发（与实施计划一致），而不是在创建关卡时触发，避免 AI 抢跑。
- 揭晓页在规范的三种标题之外，补充「AI 仍在判断」（AI 尚未返回）和「无人获胜」（双方都错）两种状态。
- 关卡图片全部由 SVG 路径绘制（不依赖系统字体或 Emoji 字体）；第 2 关不使用 AI 紫色；第 6 关的差异类型标注为形状；第 10 关使用亮度差，色觉差异用户也可辨认。
- 第 20 关偏移约 1.5 CSS 像素，在 3 倍屏上约 4–5 个物理像素。
- 海报在浏览器内用 Canvas 生成，以使用系统中文字体；分享链接中的结果 ID 是服务端生成的 128 位随机令牌，前端无法伪造。
- 服务端用展示时刻和截止时间约束客户端上报的耗时：拖延到截止时间之后一律判为超时，上报的耗时不能明显短于服务端观测到的时间窗口。

## SEO site structure (2026-10-18 plan: spotthedifferencegame.com)

See `gefei-seo-sop/spot-the-difference-site-sop.md` §11. Implementation:

| Item | Where |
|---|---|
| Canonical origin `https://spotthedifferencegame.com`; www and `human-ai.zdychanges.workers.dev` 301 to it (API excluded) | `src/config/site.ts`, `next.config.ts` redirects, `wrangler.jsonc` routes |
| English only: `/zh/*` and retired URLs 308 to English; hreflang self + x-default | `src/i18n/config.ts` (`locales = ["en"]`), `next.config.ts` |
| Keyword pages (one word, one page) with a playable board in the first screen | `src/content/keyword-pages.ts`, `src/components/site/KeywordPage.tsx`, `src/games/spot-the-difference/quick/*` |
| `/printable` (SVG print sheets + answer key), `/pictures` (sprite gallery), `/christmas` (holiday sprite set) | `src/app/[locale]/{printable,pictures,christmas}` |
| Hidden hub `/games`: meta noindex,nofollow + `X-Robots-Tag`, `Disallow: /games$`, no sitemap entry, no internal links | `src/config/site.ts` `HIDDEN_HUB_PATHS`, `src/app/robots.ts`, `next.config.ts` headers |
| JSON-LD VideoGame + FAQPage (+ WebSite/Organization on home) | `src/seo/jsonld.tsx` |
| Simulated AI (`AI_MODE=simulated`, default) | `src/models/adapters/simulated.ts` |
| AdSense placeholders (hidden until `NEXT_PUBLIC_ADS_ENABLED=1`, no script, no publisher id) | `src/components/site/AdSlot.tsx` |
| Daily 3-run limit applies to the 20-level run only; quick boards are unlimited and offline | `src/core/limits/*` |
