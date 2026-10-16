# SEO 冷启动 SOP（可复用 · humanvsai.app 首用）

> 来源：web.cafe SEO Agent（有 Semrush/趋势数据，冲突时以它为准）+ 哥飞 SEO 三份调研（spot-difference-game-seo / human-vs-ai-platform-seo / human-vs-ai-cold-start）。
> 标记：【数据】= 有搜索量/KD/原帖实例；【经验】= 经验判断，需上线后用 GSC 验证。

## 0. 上线前（选词定页）
- 每个可索引页只主攻 1 个主词 + 2–3 个近义词。【经验】
- 本项目词表（US 月搜/KD）【数据】：
  - 首页 find the difference game 4,400 / 42.5（前十全是内页，首页有机会）
  - /spot-the-difference/：spot the difference game 5,400 / 53.8 + spot the difference 18,100
  - /find-the-difference/：find the difference 9,900 / 48.6
  - /human-vs-ai/：human vs ai 2,900 / 27.6（同比 -56%，只做一个内页）
  - 不做：spot the difference online（320）；Jev / Decisions API / Clef / gpt-6-luna（几乎无搜索，Jev 只剩峰值 9%）
- 域名/URL 不带他人品牌名；不用官方 logo；页面如实写明 AI 对手是哪个模型、无隶属关系。【经验+社区共识】
- 后缀不影响 SEO【数据：SEO Agent；100 万 UV 小游戏站用 .app】。

## 1. 第 1 周（技术 + 收录 + 首发）
- [ ] 服务端渲染：title/description/H1/正文/FAQ 都在初始 HTML 中。【经验，Google 文档】
- [ ] 移动优先：单一响应式站，不做 m. 域名。【数据：Google mobile-first】
- [ ] sitemap.xml（只放可索引页，带 hreflang alternates）+ robots.txt（屏蔽 /api/、/play/、/result/、带参数分享链接）。
- [ ] canonical 自指；?ref/?utm 等参数 canonical 回干净 URL。
- [ ] JSON-LD：游戏页 ["VideoGame","WebApplication"]；FAQPage；BreadcrumbList。
- [ ] GSC 用 DNS 验证 → 提交 sitemap → 首页/主落地页手动请求编入索引。
- [ ] Bing Webmaster 从 GSC 导入；开 Cloudflare Crawler Hints（IndexNow）；必要时 Bing URL Submission API（社区：几小时~2 天抓取，收录≠排名）。【数据：原帖】
- [ ] 旧 workers.dev 全路径 301 → humanvsai.app。
- [ ] GA4 + Microsoft Clarity。
- [ ] 当天首发：Reddit r/WebGames、r/playmygame、r/indiegames，标题主打「free, no signup, live AI opponent」+ 真实胜率。【SEO Agent 建议】
- [ ] 免费目录：backlinkdirs.com 按 Free 标签铺满（aidirs.org 免费 DR39）。【数据】
- 注意：不要每天反复提交 sitemap 求安慰，重点是持续加内页 + 慢慢加外链（哥飞原帖）。【数据：原帖】

## 2. 第 2–4 周（内容 + 外链）
- 第 2 周：关卡页上线，每页带独有数据（题图、AI 平均用时、人类胜率、通关数）；没有独有数据的页 noindex，避免规模化内容滥用。【Google spam policy】
- 第 2 周：提交游戏门户 CrazyGames（H5，首包 ≤50MB）、itch.io、Newgrounds。Poki 不允许外部请求，与实时 AI 冲突，跳过。GameDistribution 要求完整英文游戏、不能跳外站，暂缓。【数据：官方文档】
- 第 3 周：/human-vs-ai/、/ai-opponents/<已接入模型>/、排行榜快照；Uneed / Peerlist 首发；Product Hunt 用真人感个人号、带数据发布。
- 第 4 周：发一篇真实对局统计文章（人类 vs AI 胜率、最难关卡）作为外链诱饵，投 Show HN（nofollow，主要拿曝光）。
- 每周：看竞品新增 dofollow 外链，去重跟进；按 GSC 有展示的长尾词补页面。【经验：哥飞方法】
- 外链顺序：免费目录 → 交换 → 付费（优先高 DR/高流量）。不买垃圾链、不程序群发。

## 3. 渠道清单（外链属性）
| 渠道 | 费用 | 链接 | 备注 |
|---|---|---|---|
| backlinkdirs.com 免费目录 | 免费 | 多为 dofollow | 先铺满 Free 标签 |
| aidirs.org | 免费 | dofollow, DR39 | 【数据】 |
| There's An AI For That | $49 / 每月 X 讨论串免费 | followed | |
| BetaList | 付费 | followed | |
| Uneed | 免费档 | 20 upvote 后 followed | |
| Peerlist | 免费 | 周前 5 才给 | |
| Show HN | 免费 | 多为 nofollow | 曝光 |
| Product Hunt | 免费 | 曝光为主 | 真人号 + 数据 |
| Reddit | 免费 | nofollow | 流量/口碑 |
| CrazyGames / itch.io / Newgrounds | 免费 | 视平台 | 可发 |
| Creem 店铺页 | — | dofollow | 有付费功能时 |
| Futurepedia | ~$497 | nofollow | 不推荐 |
| Toolify | 待核实 | 待核实 | 用浏览器确认 |
| Poki | — | — | 大概率不过 |
- 付费目录排除规则【数据：web.cafe 原帖】：Ahrefs 标 spam、月流量 <1k、搜索流量占比 <10%、DR<10、近期流量腰斩、出站链接过多、停留 <30s；dang.ai 为跳转假链。
- 分享海报/结果卡印域名 + 关卡链接，让每次分享带回链。

## 4. 检查点【经验阈值】
| 时间 | 合格线 | 不达标动作 |
|---|---|---|
| Day 7 | 首页已收录 | 查 robots/canonical/渲染；GSC 请求编入索引；补 1–2 条外链 |
| Day 14 | ≥50% 提交页收录；每日有展示；品牌词第 1 | 合并薄页、补独有数据、加内链 |
| Day 30 | 展示周环比上升；出现非品牌词；部分长尾进前 50；≥10 引荐域名 | 继续目录/交换外链；按展示词新增内页 |

## 5. 风险
- 规模化内容滥用：模板页无独有数据 → noindex。
- 品牌/商标：URL/域名不放他人品牌，不用官方 logo，写明无隶属。
- 成本：AI API 设每日上限，超限降级为「回放模式」（播放真实历史 AI 对局），并在页面标明。
- 排行榜防刷：服务端计时、签名结果、频率限制、异常剔除。
- 新词窗口短（nlweb 案例两个月流量归零）：热点词只做辅助。【数据：原帖】
