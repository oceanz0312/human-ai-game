# v1 发布检查清单

## 1. 干净环境构建

- [ ] 在新的临时 clone 中执行 `npm ci`。
- [ ] `npm run levels:validate`、`npm run lint`、`npm run typecheck`、`npm run worker:typecheck`、`npm test`、`npm run build`、`npm run test:e2e` 全部退出码为 0。
- [ ] `git status` 干净；`public/levels/v1/*.png` 与 `src/levels/public-catalog.generated.ts` 已提交且与 `npm run levels:generate` 结果一致。

## 2. 环境与密钥

- [ ] 游戏服务：`DECISIONS_WORKER_URL`、`DECISIONS_WORKER_SHARED_SECRET`、`DATABASE_URL`、`DATABASE_AUTH_TOKEN`、`RESULT_SIGNING_SECRET`、`PUBLIC_BASE_URL` 已配置，`DECISIONS_MODE` 未设为 `fake`。
- [ ] 游戏服务环境中不存在 `OPENAI_API_KEY`。
- [ ] Worker：`wrangler secret put OPENAI_API_KEY` 与 `wrangler secret put DECISIONS_WORKER_SHARED_SECRET` 已执行；`wrangler.jsonc` 中没有明文密钥。
- [ ] 两端共享密钥一致，长度 ≥ 32 字节随机值。

## 3. 数据库

- [ ] 对生产 LibSQL 执行 `DATABASE_URL=... DATABASE_AUTH_TOKEN=... npm run db:migrate`。
- [ ] 确认 `players`、`sessions`、`rounds`、`results`、`bests`、`events` 表与索引存在。
- [ ] 备份策略已开启。

## 4. Worker 部署与回滚

- [ ] `npm run worker:deploy:preview`，用预览 Worker 跑一局 3×3 和一局 9×9：返回的选项属于候选集，`rounds.ai_probabilities` 与 `ai_confidence` 已落库。
- [ ] 浏览器 DevTools 只出现同源请求，没有 `api.openai.com`、`workers.dev`、OpenAI Key 或 Worker 密钥。
- [ ] `npm run worker:deploy` 发布正式 Worker。
- [ ] 回滚：`npx wrangler rollback --config workers/decisions/wrangler.jsonc`；游戏服务无需改动，回滚期间 AI 显示「AI 掉线」。

## 5. 密钥轮换

- [ ] 先写入 Worker 新密钥并部署，再更新游戏服务密钥并重启。
- [ ] `RESULT_SIGNING_SECRET` 轮换会使现有匿名玩家 Cookie 失效（玩家变成新匿名身份），只在泄露时执行。

## 6. 资源与产品验收

- [ ] 首页只有一个主操作；前 5 关无需说明即可理解；第 6 关明显切换到 9×9。
- [ ] 玩家锁定答案前看不到 AI 结果；AI 掉线时玩家结算正常。
- [ ] 排行榜只按到达关卡排序，同关同名次。
- [ ] 海报只包含品牌、动态标题、到达关卡、挑战文案、短链接和二维码。
- [ ] 在 375×812、390×844、430×932 下核对 `test-results/screens` 截图。

## 7. 监控

- [ ] Worker Observability 已开启：关注 `errorCode` 分布（`rate_limited`、`upstream_timeout`、`upstream_error`）与耗时。
- [ ] `events` 表：`level_result`、`run_end` 用于存活率漏斗；`ai_answered` 用于 AI 正确率和耗时。
- [ ] 内测收集至少 200 次首次完整挑战，第 10 关存活率达到约 10% 后冻结 v1。
