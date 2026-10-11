# HUMAN / AI 交接文档

更新时间：2026-10-11  
线上地址：https://human-ai.zdychanges.workers.dev  
仓库：https://github.com/oceanz0312/human-ai-game（`main` 分支）

本文面向接手开发和运维的同学：先说现在是什么状态，再说资源在哪里、怎么开发和部署、有哪些坑、还剩什么没做。产品规则以 [设计文档](superpowers/specs/2026-10-08-human-vs-ai-vision-game-design.md) 为准，工程细节见 [README](../README.md)。

## 1. 当前状态

- 游戏已经部署到 Cloudflare 并可公开访问。游戏服务、AI 转发 Worker、数据库全部在 Cloudflare 上，不使用 Vercel。
- AI 是真实对手：每关由 **浏览器** 携带一次性 ticket 调用 Decisions Worker（DevTools Network 可见 `POST /v1/decide-ticket`），Worker 调用 OpenAI Decisions API（`gpt-6-luna`），使用与玩家相同的关卡图片（按 ticket 内 SHA256 校验），不传答案，不人为延迟。
- Worker 通过 Service Binding 把 authoritative AI 结果写回游戏服务 `POST /api/internal/ai-result`；结算只看服务端 D1，浏览器 Worker 响应不含 AI 选的格子。
- 线上已验证：整局 20 关跑通；手机尺寸浏览器实际游玩到结算；分享页、Open Graph 图、全服排行榜正常；浏览器可看到对 Decisions Worker 的 CORS 请求，但看不到 OpenAI Key。
- 线上 D1 的测试数据已清空，排行榜从零开始。
- 本地验证：lint、类型检查（游戏服务与 Worker）、89 个单元/集成/Worker 契约测试、14 个 Playwright E2E（375/390/430 三种视口）全部通过。

## 2. 提交记录

| 提交 | 内容 |
|---|---|
| `852dd24`…`ef4070a` | 设计文档、实施计划、视觉规范 |
| `b91cefa` | 完整的 H5 游戏实现（规则、20 关、持久化、Worker、页面、分享、测试） |
| `94e2adf` | 揭晓页区分「AI 放弃作答」与「AI 掉线」 |
| `97ec7b1` | 游戏服务迁移到 Cloudflare Workers + D1 |
| 本文档所在提交 | 交接文档 |

### 2.1 `94e2adf`：拒答不再显示为掉线

Decisions API 在判断不出答案时会返回 `refusal`。原实现把它和超时、接口错误一样显示为「AI 掉线」，看起来像 AI 没参赛。设计文档 3.3 节把拒答算作 AI 输。现在：

- 揭晓数据 `RoundReveal.ai` 新增 `refused` 字段（服务端依据 `rounds.ai_error_code = 'refused'` 计算）。
- 玩家答对时显示「你赢了 · AI 放弃作答」，玩家也错时显示「无人获胜」；超时、网络、鉴权等错误仍显示「AI 掉线」。
- 胜负与扣命规则未改（原本就符合设计）。

### 2.2 `97ec7b1`：迁移到 Cloudflare

| 问题 | 处理 |
|---|---|
| D1 不支持交互式事务（Drizzle 在 D1 上发 `BEGIN` 会被拒绝） | 仓储层所有多语句写入改为 `db.batch` 原子批量；用条件更新防重复：会话只在仍处于该关卡时才更新；「比 AI 更快」次数按已结算关卡重新计数而不是自增。删除了进程内写锁 |
| 同账号 Worker 之间不能经 workers.dev 公网地址互调 | Decisions Worker 通过 Service Binding `GAME` 回调游戏服务；浏览器经 CORS 公网调 Worker；游戏服务仍保留 `DECISIONS` binding 供 `/v1/decide` 集成测试 |
| Workers 没有文件系统 | 服务端读关卡图改为经静态资源绑定 `ASSETS` |
| Next.js 需要适配 | 使用 OpenNext（`@opennextjs/cloudflare`），新增 `open-next.config.ts`、根目录 `wrangler.jsonc`、`cf:*` 脚本 |
| OpenNext 1.20.10 漏打包 Next 16.4 新增的 `.next/server/preview-props.json`，线上所有请求 500 | `patches/@opennextjs+cloudflare+1.20.10.patch`，由 `postinstall: patch-package` 自动应用 |
| 分享页 OG 图地址指向 localhost | 分享页 `generateMetadata` 设置 `metadataBase` 为公网地址 |

运行时如何选择环境（`src/server/container.ts`）：

- 仅当 `navigator.userAgent === "Cloudflare-Workers"`（即运行在 workerd 中）时读取 Cloudflare 绑定，使用 D1、`ASSETS`、`DECISIONS`。
- 其他情况（`next dev`、`next start`、测试）使用 LibSQL 文件库，并在首次请求时执行 Drizzle 迁移。
- 不能去掉 userAgent 判断：在 Node 中调用 OpenNext 的 `getCloudflareContext({ async: true })` 会启动 wrangler 本地模拟器并返回一个空的 D1，导致本地报 `no such table`。

新增测试：拒答揭晓文案、拒答结算、同一关并发重复提交只扣一条命、迟到的旧关卡结算不能覆盖新进度。

## 3. 线上资源

全部在 Cloudflare 账号 **OceanZ**（Account ID `587c03d9e8e4bfd3f69f492700086cf7`，Workers Paid 套餐），workers.dev 子域名 `zdychanges`。

| 资源 | 名称 | 地址 / ID | 配置文件 |
|---|---|---|---|
| 游戏服务 Worker | `human-ai` | https://human-ai.zdychanges.workers.dev | 根目录 `wrangler.jsonc` |
| Decisions Worker（正式） | `human-ai-decisions` | https://human-ai-decisions.zdychanges.workers.dev | `workers/decisions/wrangler.jsonc` |
| Decisions Worker（预览） | `human-ai-decisions-preview` | https://human-ai-decisions-preview.zdychanges.workers.dev | 同上，`--env preview` |
| D1 数据库 | `human-ai` | `2cb1e22d-8042-4045-b5eb-e8b1131e6925`（区域 WNAM） | 根目录 `wrangler.jsonc` |

账号下其他 Worker（`attention-api`、`lovideo_ai` 等）和 D1（`lovideo-db`、`attention`、`lovideo_ai`）与本项目无关，未做任何改动。

### 3.1 绑定与变量

游戏服务 `human-ai`：

| 名称 | 类型 | 说明 |
|---|---|---|
| `DB` | D1 | 数据库 `human-ai` |
| `ASSETS` | 静态资源 | `.open-next/assets`，含 `public/levels/v1/*.png` |
| `DECISIONS` | Service Binding | 指向 `human-ai-decisions` |
| `WORKER_SELF_REFERENCE` | Service Binding | OpenNext 需要，指向自身 |
| `DECISIONS_MODE` | 变量 | `worker` |
| `DECISIONS_WORKER_URL` | 变量 | Decisions Worker 公网地址（begin 响应交给浏览器；ticket HMAC 与内部回调共用 `DECISIONS_WORKER_SHARED_SECRET`） |
| `PUBLIC_BASE_URL` | 变量 | `https://human-ai.zdychanges.workers.dev`，用于分享链接、二维码、OG 图 |
| `DECISIONS_WORKER_SHARED_SECRET` | Secret | 与 Decisions Worker 一致 |
| `RESULT_SIGNING_SECRET` | Secret | 签名匿名玩家 Cookie |

Decisions Worker（正式和预览各一套）：

| 名称 | 类型 | 说明 |
|---|---|---|
| `DB` | D1 | 与游戏服务同一库 `human-ai`；表 `decision_ticket_uses` 做单次 ticket 消费 |
| `GAME` | Service Binding | 指向 `human-ai`，回调 `POST /api/internal/ai-result` |
| `PUBLIC_BASE_URL` | 变量 | 与游戏服务一致；CORS 允许来源 + Worker 拉关卡 PNG |
| `OPENAI_BASE_URL` / `OPENAI_DECISIONS_MODEL` / `OPENAI_DECISIONS_TIMEOUT_MS` | 变量 | 默认 `https://api.openai.com/v1` / `gpt-6-luna` / `8000` |
| `OPENAI_API_KEY` | Secret | 仅 Worker |
| `DECISIONS_WORKER_SHARED_SECRET` | Secret | Ticket HMAC + 内部回调 Bearer（与游戏服务相同） |

### 3.2 密钥存放

仓库中不包含任何密钥明文。密钥只存在于 Cloudflare Secret 和交接人本机的以下位置（均不进 git）：

| 位置 | 内容 |
|---|---|
| `~/.config/human-ai-game/cf.env`（权限 600） | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` |
| `~/.config/human-ai-game/cloud.env`（权限 600） | 云端共享密钥 `WORKER_SHARED_SECRET`、`RESULT_SIGNING_SECRET` |
| `workers/decisions/.dev.vars` | 本地 Worker 用的 OpenAI Key 与本地共享密钥 |
| `.env.local` | 本地游戏服务配置（当前指向云端正式 Decisions Worker） |

**OpenAI Key 和 Cloudflare API Token 都曾以明文出现在飞书聊天中，必须轮换**，步骤见第 6 节。

## 4. 本地开发

需要 Node.js 22+。

```bash
npm install                 # postinstall 会自动应用 patches/
cp .env.example .env.local  # 不配置 DECISIONS_WORKER_URL 时，开发环境使用本地假 AI
npm run dev                 # http://localhost:3000，首次请求自动迁移 local.db
```

- 想在本地接真实 AI：在 `.env.local` 中设置 `DECISIONS_MODE=worker`、`DECISIONS_WORKER_URL`、`DECISIONS_WORKER_SHARED_SECRET`。可以指向云端 Worker，也可以 `npm run worker:dev` 起本地 Worker（需要 `workers/decisions/.dev.vars`）。
- 游戏服务实例在 `next dev` 中缓存在 `globalThis` 上，热更新不会替换它。**改了 `src/server` 下的代码后要重启 `npm run dev`**，否则会继续跑旧逻辑。
- `next dev` 会在根目录自动生成 `AGENTS.md`，不要提交（或在 `next.config.ts` 设置 `agentRules: false`）。
- 用 Cloudflare 运行时预览构建产物：`npm run cf:preview`。

常用检查：

```bash
npm run levels:validate && npm run lint && npm run typecheck && npm run worker:typecheck
npm test            # 单元、集成、Worker 契约（LibSQL）
npm run test:e2e    # 构建后用假 AI 跑移动端 E2E，约 3.5 分钟
```

## 5. 部署

前置：本机导出 Cloudflare 凭据。

```bash
set -a && . ~/.config/human-ai-game/cf.env && set +a
```

### 5.0 推荐顺序（浏览器 → Worker 流程）

1. **D1 迁移**（新增 `decision_ticket_uses`）：`npm run cf:db:migrate`
2. **Secrets**（若尚未设置或需轮换）：
   - 生成共享密钥（游戏服务 + Decisions Worker 各写一份相同值）：`openssl rand -base64 32`
   - 游戏服务 `human-ai`：`npx wrangler secret put DECISIONS_WORKER_SHARED_SECRET`、`npx wrangler secret put RESULT_SIGNING_SECRET`
   - Decisions Worker：`npx wrangler secret put OPENAI_API_KEY --config workers/decisions/wrangler.jsonc`（预览加 `--env preview`）、`npx wrangler secret put DECISIONS_WORKER_SHARED_SECRET --config workers/decisions/wrangler.jsonc`
3. **确认 wrangler 变量**：根目录 `DECISIONS_WORKER_URL`、`PUBLIC_BASE_URL`；`workers/decisions/wrangler.jsonc` 中 `PUBLIC_BASE_URL`、`GAME`/`DB` binding（见 3.1 节）。
4. **先部署 Decisions Worker**：`npm run worker:deploy:preview` 或 `npm run worker:deploy`
5. **再部署游戏服务**：`npm run cf:deploy`

本地/E2E 仍用 `DECISIONS_MODE=fake`，不依赖 Worker 公网可达。

### 5.1 游戏服务

```bash
npm run cf:deploy          # OpenNext 构建 + 部署 human-ai
```

### 5.2 Decisions Worker

```bash
npm run worker:deploy:preview   # 预览环境
npm run worker:deploy           # 正式环境
```

### 5.3 数据库迁移

```bash
npm run db:generate        # 修改 src/server/db/schema.ts 后生成 drizzle/ 迁移
npm run cf:db:migrate      # 应用到线上 D1（wrangler d1 migrations apply human-ai --remote）
```

线上只通过 wrangler 迁移 D1，不在请求时迁移；本地和测试的 LibSQL 仍由 Drizzle 迁移器在启动时执行同一份 `drizzle/` 目录。

### 5.4 回滚

```bash
npx wrangler rollback                                              # 游戏服务
npx wrangler rollback --config workers/decisions/wrangler.jsonc    # Decisions Worker
```

Decisions Worker 不可用时，游戏服务按「AI 掉线」处理，玩家结算不受影响。

### 5.5 冒烟检查

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://human-ai.zdychanges.workers.dev/
npx wrangler tail human-ai --format pretty     # 实时日志
```

然后用手机打开线上地址玩一两关，确认揭晓页显示了 AI 的真实耗时。

## 6. 密钥轮换

### 6.1 OpenAI Key

1. 在 OpenAI 控制台创建新 Key，确认账号有 Decisions API 与 `gpt-6-luna` 权限。
2. 写入两个环境的 Decisions Worker：

   ```bash
   npx wrangler secret put OPENAI_API_KEY --config workers/decisions/wrangler.jsonc
   npx wrangler secret put OPENAI_API_KEY --config workers/decisions/wrangler.jsonc --env preview
   ```

3. 线上玩一关确认 AI 正常作答后，在 OpenAI 控制台删除旧 Key。
4. 同步更新本地 `workers/decisions/.dev.vars`。

### 6.2 Cloudflare API Token

1. Cloudflare 控制台 → Manage Account → Account API Tokens 新建 Token，权限需覆盖 Workers 脚本编辑、D1 编辑、Account Settings 读取。
2. 替换 `~/.config/human-ai-game/cf.env` 中的 `CLOUDFLARE_API_TOKEN`，运行 `npx wrangler whoami` 验证。
3. 删除旧 Token。

### 6.3 Worker 共享密钥

先写入两个 Decisions Worker，再写入游戏服务；中间短暂窗口内 AI 显示「AI 掉线」，不影响结算：

```bash
npx wrangler secret put DECISIONS_WORKER_SHARED_SECRET --config workers/decisions/wrangler.jsonc
npx wrangler secret put DECISIONS_WORKER_SHARED_SECRET
```

`RESULT_SIGNING_SECRET` 轮换会让所有玩家变成新的匿名身份（个人最佳与排名无法再关联），只在泄露时执行。

## 7. 已知问题与注意事项

1. **AI 拒答固定出现在第 8、16、20 关。** 第 8 关「未/末」、第 16 关「土/士」是相似汉字，第 20 关是约 1.5 像素的偏移。多次测试都稳定拒答，其余 17 关 AI 全部答对。Decisions API 没有关闭拒答的参数。
2. **玩家几乎不可能比 AI 快。** 经 Service Binding 后 AI 端到端约 0.16–0.45 秒（第一关冷启动约 1 秒），真人点击通常超过 1 秒。「比 AI 更快」基本只会在 AI 拒答或冷启动时出现，分享标题大多会是「我到达了第 N 关」。设计要求不人为放慢 AI，是否调整需要产品决定。它不影响生命和排行榜。
3. **workers.dev 在中国大陆访问不稳定。** 如主要面向国内用户，需要绑定自有域名（Cloudflare Registrar 约 10 美元/年），之后同步修改 `wrangler.jsonc` 中的 `PUBLIC_BASE_URL`。
4. **lockfile 混用了内网镜像。** `package-lock.json` 中约 650 个依赖的 `resolved` 指向公司内网 `https://bnpm.byted.org`，约 310 个指向 `registry.npmjs.org`。外网环境 `npm ci` 会失败。建议把 `bnpm.byted.org` 统一替换为 `registry.npmjs.org` 后重新 `npm install` 验证。在内网安装时，个别包内网镜像缺失，需要加 `--registry=https://registry.npmjs.org`。
5. **OpenNext 补丁。** 升级 `@opennextjs/cloudflare` 时补丁可能失效；先确认上游是否已内联 `preview-props.json`，修复后删除 `patches/` 下的对应文件。不打补丁的症状是线上所有请求报 `Unexpected loadManifest(/.next/server/preview-props.json) call!`。
6. **仓储层不要使用 `db.transaction`。** D1 不支持。新增多语句写入时用 `db.batch`，并保证每条语句在重复执行时无副作用。
7. **包体积。** 游戏服务 gzip 后约 2.5 MB。Workers 免费套餐上限 3 MB，付费套餐 10 MB；降级套餐前要先确认体积。
8. **npm 安装脚本被拦截。** 当前 npm 默认不执行依赖的 install 脚本（`workerd`、`sharp` 等会提示）。目前构建与部署不受影响；若本地 `wrangler dev` 或 `sharp` 出错，运行 `npm install-scripts approve <包名>`。

## 8. 待办

按优先级排列：

1. 轮换 OpenAI Key 与 Cloudflare API Token（第 6 节）。
2. 修复 lockfile 内网镜像问题（第 7 节第 4 条），否则外部协作者无法安装。
3. 决定是否绑定自有域名，并确定 AI 速度与「比 AI 更快」玩法如何平衡。
4. 内测并校准难度：收集至少 200 次首次完整挑战，第 10 关存活率达到约 10% 后冻结 v1。数据在 D1 `events` 表（`level_result`、`run_end`、`ai_answered`）。冻结后关卡图片、答案和时限不得再改，调整需新建 `levelSetVersion`。
5. 逐项完成 [发布检查清单](release-checklist.md)，包括三种视口截图的人工验收、Worker Observability 监控和 D1 备份（D1 自带 Time Travel，可确认保留期是否满足要求）。
6. 补充 HTTP 路由层测试（计划中的 `api-game.test.ts`：400/404/409 状态码），目前只覆盖了服务层和 E2E。
7. 文档对齐：设计文档头部仍写「待开发」，第 7.4 节写「本机最佳」，实际实现的是全服排名与个人最佳；`.env.example` 中称 `RESULT_SIGNING_SECRET` 会签名海报 URL，实际海报在浏览器内用 Canvas 生成，该密钥只签名玩家 Cookie。

## 9. 关键文件索引

| 文件 | 作用 |
|---|---|
| `src/server/container.ts` | 组装游戏服务；按运行环境选择 D1/LibSQL、读图方式、AI 客户端 |
| `src/server/repositories/game-repository.ts` | 持久层，原子批量写入与并列排名 |
| `src/server/game-service.ts` | 会话、开局、AI 调度、结算 |
| `src/server/db/client.ts`、`src/server/db/d1.ts` | LibSQL 与 D1 的 Drizzle 实例 |
| `src/server/decisions/` | Worker 线协议、服务端客户端、测试用假客户端 |
| `workers/decisions/src/` | Decisions Worker（唯一持有 OpenAI Key） |
| `src/game/reveal-copy.ts` | 揭晓页文案（含拒答与掉线区分） |
| `wrangler.jsonc`、`open-next.config.ts` | 游戏服务的 Cloudflare 部署配置 |
| `patches/` | OpenNext 补丁 |
| `drizzle/` | 数据库迁移（LibSQL 与 D1 共用） |
