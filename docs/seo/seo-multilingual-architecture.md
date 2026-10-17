# humanvsai.app 多语言 SEO 目录规则与改造方案（已批准并实施）

基线：main `7ae21d5`。现状：Next.js 16.4 + @opennextjs/cloudflare 1.20.10；无 i18n、无 middleware/proxy；根 layout `lang="zh-CN"`，全站一条中文 metadata；路由只有 `/`、`/play/[sessionId]`、`/result/[publicId]`（noindex）、`/share/[publicId]`（含 OG 图）、`/api/*`；无 sitemap/robots/JSON-LD；`PUBLIC_BASE_URL` 在 wrangler vars 中，`src/server/public-url.ts` 读取。

## a) URL / 多语言规则
1. **语言策略：英文默认放根目录不加前缀，其它语言子目录** `/zh/`、`/ja/`、`/es/`…（以后加 `/pt/` `/ko/` 等只加字典）。
   - 理由：Google 推荐每种语言独立 URL，子目录/子域/ccTLD 都可，不建议用 cookie/IP 动态切换同一 URL 的内容；主要用户在海外，英文主词在根目录 URL 最短，所有权重集中在一个域名。
   - 中文用 `/zh/`（不分简繁；以后要繁体再加 `/zh-hant/`）。hreflang 写 `zh-Hans`。
2. **hreflang**：每个可索引页在 `<head>` 和 sitemap 里互相列出全部语言版本 + 自己 + `x-default`（指向英文根）。只列存在且可索引的语言版本（双向）。
3. **canonical**：每个语言版本 canonical 指向自己（不能都指向英文）；参数页 canonical 回干净 URL。
4. **语言检测**：不做强制 IP / Accept-Language 跳转（Googlebot 多从美国爬，会被锁英文）。客户端读 `navigator.language`，与当前页不一致时显示顶部小横幅「切换到中文？」，选择记 cookie `hv_locale`，只影响横幅和语言切换器，不 302。
5. **slug：全语言统一英文 slug**（`/zh/games/spot-the-difference/`）。理由：一套路由表、hreflang 映射零维护、加语言零成本；本地化 slug 收益小（且中日文 URL 编码难看）。标题/H1/描述本地化即可。
6. **尾斜杠**：统一**无尾斜杠**（Next 默认 `trailingSlash:false`），`/x/` 308→`/x`。全小写、连字符。
7. **参数**：`?ref` `?utm_*` `?s=` 分享参数 → canonical 到无参 URL，robots 不屏蔽（否则 canonical 读不到），sitemap 不收录；会话/结果类 URL（`/play/*`、`/result/*`、`/share/*`）noindex。

## b) 信息架构（多游戏可扩展）
**建议：关键词落地页放根目录**（`/spot-the-difference`、`/find-the-difference`），短且关键词靠前；游戏的结构化页面放 `/games/<slug>/…`。`/games/spot-the-difference` 不另做落地页，301 到 `/spot-the-difference`，避免两页抢同一词。以后新游戏若有大词（如 `/chess-vs-ai`）同样上根，没有就用 `/games/<slug>`。

| 路径（英文；其它语言加 /zh 等前缀） | 类型 | 目标词 EN（其它语言 TBD） | 索引 | 渲染 | 独有数据 |
|---|---|---|---|---|---|
| `/` | 平台首页（游戏中心，按注册表列出全部游戏） | human vs ai games / play games against ai（2026-10 起，见下方偏差） | ✅ | SSG | 游戏列表（ItemList） |
| `/spot-the-difference` | 找茬主落地页（比赛动画 + 开始按钮） | find the difference game / spot the difference game / spot the difference | ✅ | SSG+ISR | 关卡网格、AI 平均用时 |
| `/find-the-difference` | 同义词落地页（不同角度：规则/技巧/难度） | find the difference | ✅ | SSG+ISR | 最难关卡榜 |
| `/human-vs-ai` | 话题页 | human vs ai | ✅ | SSG+ISR | 人 vs AI 总胜负 |
| `/games` | 游戏索引 | human vs ai games | ✅ | SSG | 游戏注册表 |
| `/games/spot-the-difference` | → 301 `/spot-the-difference` | — | — | — | — |
| `/games/spot-the-difference/play` | 游戏 App | — | ❌ noindex,follow | CSR | — |
| `/games/spot-the-difference/levels/[n]` (1–20) | 关卡页 | 按难度分三档：1–5「spot the difference level n / odd one out」，6–12「hard spot the difference / with timer」，13–20「expert / for adults」；中文「大家来找茬第 n 关 / 找不同 / 高难度 / 极限 / 考眼力」 | ✅仅当该关样本≥N(如30局)，否则 noindex | ISR 1h | 题图缩略、AI 用时、人类胜率、最快成绩 |
| `/games/spot-the-difference/leaderboard` | 排行榜 | spot the difference leaderboard | ✅ | ISR 5min | 榜单 |
| `/ai-opponents` | 对手索引 | — | ✅ | SSG | 已接入模型 |
| `/ai-opponents/[model]`（目前仅 `openai-decisions` 类中性 slug，如 `luna`） | 模型对战页 | 不追品牌词，写真实数据 | ✅ | ISR | 该模型用时/胜率 |
| `/how-to-play` `/faq` `/about` | 支撑页 | how to play spot the difference 等 | ✅ | SSG | FAQ |
| `/privacy` `/terms` | 法务 | — | ✅（不进重点内链） | SSG | — |
| `/play/[sessionId]` `/result/[publicId]` | 现有会话页 | — | ❌ | SSR | — |
| `/share/[publicId]` | 分享页 | — | ❌ noindex,follow（OG 保留） | SSR | — |
| `/sitemap.xml` `/robots.txt` | — | — | — | 路由生成 | — |

注：模型 slug 用中性名，不放 openai/jev/clef 品牌名；页面正文如实写对手模型与无隶属声明。

**301 计划（切域名时）**：`human-ai.zdychanges.workers.dev/*` → `https://humanvsai.app/*` 保留路径与参数；旧 `/` → `/`；旧分享链接 `/share/*` 原样保留可用。站内 `/games/spot-the-difference` → `/spot-the-difference`。

## c) 代码改造（映射到现仓库）
1. **路由**：`src/app/[locale]/…` 动态段 + `generateStaticParams` 生成 `en,zh,…`。英文无前缀实现：**不用 middleware/proxy**（Next 16 的 proxy 默认 Node 运行时，OpenNext/Workers 兼容性需验证），改用 `next.config.ts` `rewrites`：`/:path((?!zh|ja|es|api|_next).*)` → `/en/:path`；访问 `/en/*` 308 → 无前缀。备选：OpenNext 支持的 edge middleware（PR1 先做 spike 验证）。
2. **字典**：`src/i18n/config.ts`（locales、default、hreflang 映射）、`src/i18n/dictionaries/{en,zh}.json`，server component `getDictionary(locale)`；客户端组件经 props 传文案。现有中文文案（`danmaku-messages.ts`、`reveal-copy.ts`、`ai-error-copy.ts` 等）抽到字典。根 layout 改为 `[locale]/layout.tsx` 设置 `<html lang>`。
3. **metadata**：每页 `generateMetadata` → title/description/`alternates.canonical`/`alternates.languages`（含 `x-default`）/openGraph/twitter；`metadataBase` 用 `publicBaseUrl()`。工具函数 `buildSeoMeta(route, locale)`。
4. **sitemap**：`src/app/sitemap.ts`，从游戏注册表 + 关卡统计（D1）生成，每条带 `alternates.languages`；只收录可索引页（关卡页按样本阈值）。>50k 再拆分。
5. **robots**：`src/app/robots.ts`：Disallow `/api/`；允许其余；`Sitemap:` 用 `PUBLIC_BASE_URL`。noindex 页用 meta robots 而非 Disallow。
6. **JSON-LD**：`<JsonLd>` 组件；落地页 `["VideoGame","WebApplication"]`（name、url、applicationCategory: GameApplication、operatingSystem: Any、offers price 0、inLanguage、gamePlatform: Web browser）；FAQ 页 `FAQPage`；所有内页 `BreadcrumbList`；首页 `WebSite` + `Organization`。
7. **OG 图**：每路由 `opengraph-image.tsx`（已有 share 先例）；注意现字体无 CJK → 为 zh/ja 打包 Noto Sans SC/JP 子集，或预生成静态 PNG 放 `public/og/`。
8. **PUBLIC_BASE_URL**：wrangler vars 切 `https://humanvsai.app`；加 `routes`/custom domain；保留 `workers_dev:true` 期间在 Worker 入口（OpenNext 自定义 worker wrapper）对 `*.workers.dev` host 返回 301。域名未定前 canonical 先用当前 base，切换后 301 一起生效。
9. **统计**：`src/components/Analytics.tsx`，`NEXT_PUBLIC_GA4_ID`、`NEXT_PUBLIC_CLARITY_ID` 为空则不加载；保留现 `/api/analytics`。
10. **游戏注册表**：`src/games/registry.ts`
   ```ts
   export const games = [{ slug:"spot-the-difference", landingPath:"/spot-the-difference", status:"live",
     levels:20, opponents:["luna"], i18nKey:"games.spotTheDifference", jsonLdGenre:"Puzzle" }];
   ```
   `/games`、导航、sitemap、面包屑、hreflang 全部遍历注册表；新增游戏 = 注册表一条 + 字典 + `src/games/<slug>/` 组件。
11. **兼容**：现 `/play/[sessionId]` 先保留，新入口 `/games/spot-the-difference/play` 创建会话后跳转，避免一次性大迁移。

## d) 一屏决策点（已批准：方案 A）
- **方案 A：所有页一屏，SEO 文本拆子页**（402×874）：顶部 56px 品牌栏+语言切换；H1（2 行）+ 40–60 词简介；中部 HomeRaceAnimation（~220px）；大「开始」按钮；底部 3–6 张链接卡（How to play / Levels / Leaderboard / Human vs AI）。FAQ 用 `<details>` 折叠（内容在 HTML 里，展开不滚屏则需控制长度）。优点：守规则；缺点：单页内容薄，主词排名慢。
- **方案 B（SEO Agent 推荐，哥飞本人也放弃强一屏）**：游戏页（play/result）仍严格一屏；落地页首屏 874px 内 = H1 + 竞赛动画/短演示 + 开始按钮 + 关键数据条，与方案 A 首屏一致；首屏下方可滚动正文约 1,200 词（玩法、技巧、人 vs AI 数据、关卡网格、FAQ）。优点：内容厚、主词有机会；代价：落地页需滚动（玩的时候不受影响）。
- 建议 B；未批前按 A 的首屏开发（两方案首屏相同，B 只是在下面加内容，不返工）。

## e) 分阶段 PR（不部署、不注册，批后执行）
| PR | 内容 | 估时 |
|---|---|---|
| 1 | i18n spike：`[locale]` + rewrites 在 OpenNext 预览中验证；字典骨架；`<html lang>` | 0.5–1 天 |
| 2 | 抽取现有中文文案到 zh 字典 + 写 en 字典；英文默认 | 1–1.5 天 |
| 3 | 游戏注册表 + 新路由（/games、落地页、play 入口、how-to-play/faq/about/legal） | 1 天 |
| 4 | SEO 基建：generateMetadata、hreflang、canonical、sitemap、robots、JSON-LD、参数 canonical | 1 天 |
| 5 | 关卡页 + 排行榜页 + D1 统计聚合（样本阈值 noindex）+ OG 图（含 CJK 字体） | 1.5 天 |
| 6 | 落地页正文（视 A/B）+ Analytics 占位 + 语言横幅 | 1 天 |
| 7 | （有域名后）custom domain、PUBLIC_BASE_URL、workers.dev 301、GSC/Bing/Crawler Hints | 0.5 天 |
合计约 6.5–8 人日。

**E2E 验收清单**
- [ ] Playwright：375/390/402 宽度下 play/result/reveal 无滚动（`scrollHeight<=innerHeight`）；方案 A 时所有页同测
- [ ] 每个可索引页 curl 原始 HTML 含 title/H1/正文/JSON-LD（非 JS 渲染）
- [ ] hreflang 双向+x-default 校验（脚本遍历 sitemap；或 Merkle hreflang 工具）
- [ ] canonical 自指；`?ref=x` 页 canonical 正确；noindex 页列表正确
- [ ] sitemap 可解析、仅含 200 可索引 URL；robots 正确
- [ ] Google Rich Results Test：VideoGame/SoftwareApp、FAQ、Breadcrumb 无错误
- [ ] Lighthouse 移动端 SEO ≥95、Performance ≥80
- [ ] 尾斜杠 308、`/en/*` 308、`/games/spot-the-difference` 301
- [ ] 现有对局全流程（真实 AI、无自动推进）回归通过

## 实施记录与偏差（2026-10）

| PR | 内容 | Worker 版本 |
|---|---|---|
| [#13](https://github.com/oceanz0312/human-ai-game/pull/13) | i18n 路由（英文无前缀，`/zh/*`） | bfc68d2f-79b9-49a1-a0b2-cfc8a6cd02f3 |
| [#14](https://github.com/oceanz0312/human-ai-game/pull/14) | 游戏内文案本地化 | 655cdeae-1f72-4c4d-9077-0fdde7428133 |
| [#15](https://github.com/oceanz0312/human-ai-game/pull/15) | 游戏注册表 + 内容子页 | 68ebec04-b044-450d-87dc-1cd9d7802d41 |
| [#16](https://github.com/oceanz0312/human-ai-game/pull/16) | metadata / hreflang / canonical / sitemap / robots / JSON-LD | 4b6abe77-dfbe-419d-b0d3-81ee54d18b3d |
| [#17](https://github.com/oceanz0312/human-ai-game/pull/17) | 关卡页、排行榜、OG 图 | a88d5bfc-78e9-4bcd-aaf9-b4065e9ab8c5 |
| [#18](https://github.com/oceanz0312/human-ai-game/pull/18) | 可选 GA4/Clarity + 语言建议条（不跳转） | 5fa60be0-0b51-4185-a638-22f9519d0510 |
| 本 PR | docs/seo 文档 | 仅文档，无需部署 |

改造前版本：1982bef6-56f8-4a2e-bf61-0bd3536b812b。

偏差：
- 路由：未用 middleware；英文通过 `next.config` afterFiles rewrite 到 `/en/...`，`/en/*` 308 到无前缀，OpenNext/Workers 上可用。对局页在 `app/(game)` 路由组，语言取自 `hv_locale` cookie。
- `/games/spot-the-difference` 为 308（Next 永久重定向默认），非 301；效果等同。
- 关卡页/排行榜为 SSR（force-dynamic）读 D1 实时数据，而非 ISR；关卡 <30 局时 noindex。
- OG 图为预渲染静态 PNG（`scripts/generate-og.mjs`），非运行时生成。
- `/spot-the-difference/play` 是带「开始」按钮的 noindex 入口页，而非自动跳转。
- 域名：canonical 源为 `.env.production` 的 `NEXT_PUBLIC_SITE_URL`（当前 workers.dev）。切换到 humanvsai.app 时改该值，并同步两个 wrangler 配置中的 `PUBLIC_BASE_URL`。workers.dev→humanvsai.app 的 301 暂缓。
- 分析：GA4/Clarity 仅在 `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_CLARITY_ID` 非空时加载，默认关闭。

遗留：现有游戏文案仍含「条命」「20 关」等表述待改；仓库无 CI；排行榜昵称回退为「玩家 XXXX」（英文 UI 显示 Player XXXX）。


## 实施记录（2026-10 网页版重设计 · 多游戏平台首页）

| PR | 内容 | Worker 版本 |
|---|---|---|
| [#20](https://github.com/oceanz0312/human-ai-game/pull/20) | PR-1：响应式站点外壳（顶栏/页脚/容器），品牌改为 HUMAN VS AI | 6a9babb2-3abc-4557-8aac-d6072d64cb39 |
| [#21](https://github.com/oceanz0312/human-ai-game/pull/21) | PR-2：对局/揭晓 GameStage 响应式布局 | 5e4189b3-5692-40d6-9e23-1f45b4205779 |
| PR-3 | 平台首页（注册表驱动）、找茬落地页、内容页方案 B、结果页准确率 | 见 PR |

重设计前版本：5fa60be0-0b51-4185-a638-22f9519d0510。

### 偏差：首页改为平台游戏中心（用户 2026-10-17 要求）
- 原方案中 `/` 是「平台首页 + 找茬入口」，主词 find the difference game。现改为**多游戏平台首页**：首屏为人类 vs AI 平台主张，下方是按 `src/games/registry.ts` 渲染的游戏卡片（上线游戏 + 「筹备中 · 暂定名」占位卡）、怎么玩、FAQ。首页不再是找茬游戏页。
- 首页 title / description / H1 改用平台词：EN「Human vs AI Games – Can You Beat the AI?」，H1「Human vs AI / Play games against real AI」；ZH「人类 vs AI 小游戏：和真实 AI 对战」，H1「人类 VS AI / 和真实 AI 同场对战」。
- find the difference / spot the difference 主词移到 `/spot-the-difference`：title「Spot the Difference Online – Find the Difference Game vs AI (Free)」/「大家来找茬在线玩：找不同小游戏，和真实 AI 比快」，H1「Spot the Difference: You vs AI」/「大家来找茬：你比 AI 更快吗？」，首屏保留比赛动画与「开始」按钮；对局仍在 `/games/spot-the-difference/play`。
- 结构化数据：首页 WebSite + Organization + ItemList（只列上线游戏）+ FAQPage；游戏落地页 VideoGame + BreadcrumbList（首页 › 全部游戏 › 大家来找茬）；`/games` 也输出 ItemList。
- 新增游戏的流程：在注册表加一条（含落地页/玩法页）+ `gameCopy` 文案，即自动出现在首页、`/games`、顶栏、页脚、sitemap 与 ItemList。占位卡（`plannedGames`）只在首页和 `/games` 以灰色卡片出现，不生成路由，不进 sitemap / 导航 / JSON-LD。
- 内容页改为方案 B：首屏自成一体（面包屑、H1、简介、主按钮），下方可滚动；对局与揭晓页仍严格一屏。


## 实施记录（2026-10-18 · 关卡页长尾词）

| PR | 内容 |
|---|---|
| 见 PR「remaining fixes」 | 关卡页按难度分档写 title / description / H1 / 简介 / 技巧段，面包屑改用短名「Level n / 第 n 关」 |

- 分档（`src/seo/level-tier.ts`）：
  - easy（第 1–5 关，3×3，8→6 秒）
  - hard（第 6–12 关，9×9，7→4.6 秒）
  - expert（第 13–20 关，9×9，4.4→3 秒）
- 文案在 `src/i18n/pages/{en,zh}.ts` 的 `pages.level.tiers`，变量：`{n}`（关卡）、`{grid}`（边长）、`{cells}`（格子数）、`{secs}`（限时秒数）、`{tier}`（档位名）。

| 档位 | 英文主攻 | 中文主攻 |
|---|---|---|
| easy | spot the difference level n、find the odd one out | 大家来找茬第 n 关、找不同入门 |
| hard | hard spot the difference、spot the difference with timer、find the difference | 高难度找不同、找茬、考眼力 |
| expert | expert / hard spot the difference for adults、beat the AI | 极限找不同、考眼力 |

- 英文示例：
  - title「Hard Spot the Difference Level 7 (9×9, 6.5s Timer) | HUMAN VS AI」
  - H1「Hard Spot the Difference: Level 7」
- 中文示例：
  - title「大家来找茬第 18 关：极限找不同，仅 3.4 秒 | HUMAN VS AI」
  - H1「大家来找茬第 18 关：极限 3.4 秒找不同」
- 每关的 description 都不同（关卡号、格子数、秒数都写进去），并有 E2E 校验（`tests/e2e/seo-levels.spec.ts`）。
- 收录规则不变：每关对局数 ≥30 才 index，否则 noindex，也不进 sitemap。
- 选词依据是 `keyword-research.md` 和 `spot-difference-game-seo.md` 的长尾层级（level n / hard / with timer / for adults）。本次 Semrush API 额度不足，没能补到搜索量和 KD，`keyword-research.md` 的关卡行仍记为 TBD；额度恢复后复核，再调整措辞。
