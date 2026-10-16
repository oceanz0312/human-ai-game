# Human vs AI 游戏平台：SEO 冷启动计划（2026-10-16）

前提：MVP 只有找茬一个手机 H5 游戏，对手是真实的 OpenAI Decisions API；用户在海外，英文优先；域名在 humanvsai.app 和 humanvsai.game 之间选；每页一屏、不滚动。选词和页面结构见 `human-vs-ai-platform-seo.md`。
数据说明：Semrush 额度为 0，**本计划不含搜索量和难度数据**。下面的阈值是按经验定的检查点，不是行业统计；需要来源支撑的结论都附了链接。

## 0. 哥飞方法论要点（公开文章）
- **快**：GPTsHunter 在 DevDay 后马上注册域名，第一版只有一个单页首页，放在 Cloudflare Pages 上，一天上线。然后到开放社区发帖，被大家转发，4 天拿到来自 33 个域名的 4700 条外链。[哥飞：上线4天获得4700个外链](https://mp.weixin.qq.com/s/SCPVciVQ0HJ5udq8ajuhiw)
- **导航站全提交一遍**：AI 导航站提交一轮就能拿到几十到上百条外链。[哥飞：如何赚到第一美元](https://mp.weixin.qq.com/s/wekpvfTjcs21ABoYguhGIw)
- **抄作业**：每天用 Ahrefs 免费外链检查器或 Semrush 看竞品的 dofollow 外链，去重后跟着做；自己的老站是冷启动时最好的外链。[社群案例](https://mp.weixin.qq.com/s/ubrlLR8K9SATXjyvSKdJdw)
- **什么是好外链**：按"有真实流量 > 品牌 > 活跃（用 site: 查最近 7 天有没有新收录）"排优先级；只做能被收录的外链；每天坚持手动发，不要用程序批量群发。[年终分享会笔记](https://yuanchang.org/resources/going-global/misc-17-ge-fei-nian-zhong-fen-xiang-hui-zong-jie/)
- **第一个站的目标**：进前 10 就行。提交 GSC 后，再发到爬虫常来的站点加快收录，过一两天用 site: 查收录。[即刻：哥飞解答](https://m.okjike.com/originalPosts/65b135379185c305d1eb7f87)
- 品牌词域名风险高：用别人的品牌名注册域名，容易被投诉封站（同上，年终分享会笔记）。**所以不要注册带 jev、clef、openai 的域名。**

## 1. 第一周：技术准备和首发提交
**D0–D1 技术**
1. 正式域名接入 Cloudflare。workers.dev 旧地址全部 301 跳到新域名（或加 noindex），避免两个地址内容重复。
2. **SSR 或预渲染**：每个可收录页面的 HTML 里直接带 title、H1、简介和内链，不能只靠 JS 渲染。游戏画布可以客户端加载。
3. `robots.txt`：允许抓取，放上 Sitemap 地址；屏蔽 `/api/`、对局结果的临时 URL 和带参数的分享链接。
4. `sitemap.xml`：只放 canonical 页面，带 lastmod。
5. **canonical**：每页自指；分享海报链接（如 `?score=`）指向原页面。
6. **Schema**：游戏页用 `["VideoGame","WebApplication"]` 复合类型。Google 不会给只标 `VideoGame` 的页面出富结果，必须和另一个应用类型一起标（[Google 文档](https://developers.google.com/search/docs/appearance/structured-data/software-app)）。子页加 BreadcrumbList。FAQ 只放真实问答，Google 现在很少展示 FAQ 富结果，不要指望它带流量。
7. **GSC**（[Search Console](https://search.google.com/search-console)）：用域名资源验证（DNS TXT 记录在 Cloudflare 里加），提交 sitemap，对首页和 3–5 个核心页手动"请求编入索引"。
8. **Bing Webmaster**（[链接](https://www.bing.com/webmasters)）：可以直接从 GSC 导入。在 Cloudflare 的 Cache > Configuration 里打开 **Crawler Hints**，它会通过 [IndexNow](https://www.indexnow.org/) 自动通知 Bing 等搜索引擎；免费，一键开启，返回 4xx 的页面不会上报（[Cloudflare 文档](https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/)、[博客](https://blog.cloudflare.com/cloudflare-now-supports-indexnow/)）。
9. 性能：首屏 LCP 要快，图片用 WebP 并懒加载。Cloudflare 的 Bot Fight Mode 和 WAF 不要误拦 Googlebot/Bingbot，上线后在 GSC 用"网址检查"实测一次。

**D1–D7 首发提交**（顺序：先上目录，再做社区首发）
- 当天：提交 AI 导航站中免费或低价的那批（见第 3 节），发 Show HN，再发 r/WebGames、r/playmygame。
- 第 3–5 天：Product Hunt 首发（准备 GIF、"你能赢过 AI 吗"这个钩子，用英文写好 maker comment）。
- 每天：用 Ahrefs 免费外链检查器看 1–2 个竞品，把它们的外链来源记进表格。

## 2. 第一个月：每周节奏
| 周 | 页面和内容（每页一屏） | 外链 | 社区 |
|---|---|---|---|
| W1 | 首页 + `/spot-the-difference`（游戏）+ `/how-it-works` + `/about-the-ai`（明确写出对手是 OpenAI Decisions API） | 免费 AI 目录 + 开发者自己的老站（在相关页面里自然地放链接） | Show HN、Reddit、X |
| W2 | 3–5 个关卡或主题页（如 `/spot-the-difference/level-1`），每页放一张独有题图、独有说明和本关人对 AI 的真实胜率 | 游戏门户提交（itch.io、Newgrounds 等） | Product Hunt、Indie Hackers 发帖 |
| W3 | `/models/openai-decisions-api` 对战页；`/leaderboard` 每周快照页 | 跟着竞品外链做；做 Uneed、Peerlist 首发 | 在 X 上发"AI 输给人类的 Top 5 关卡"短视频 |
| W4 | `/blog/human-vs-ai-results-week-n`：真实对局统计（人类胜率、AI 平均用时），这类内容可被引用，是最好的外链诱饵 | 拿统计数据联系 AI 和游戏博主、newsletter | r/artificial、r/OpenAI（先看版规） |

接入 Jev 或 Clef 之后，再加 `/models/jev`、`/models/cloudflare-clef`。

## 3. 渠道清单（2026-10-16 用 curl 检查；标 403 的是站点拦截了脚本访问，不代表页面不存在，提交前请用浏览器打开确认）
免费/付费和 dofollow 的信息只照来源写，**来源没说的一律写"未核实"**。上架后请自己查一下 `rel` 属性。

**A. H5 游戏门户**（注意：游戏依赖实时调用 OpenAI，很多门户要求的"打包、离线"版本和这个冲突）
| 站点 | 是否收 H5 | 备注 | URL 状态 |
|---|---|---|---|
| [CrazyGames 开发者](https://developer.crazygames.com/) | 收，提交 HTML5 web build，Basic Launch 可以不接 SDK；首次下载 ≤50MB，想上移动端首页要 ≤20MB（[技术要求](https://docs.crazygames.com/requirements/technical/)）。若对外域名要白名单，需提前沟通 | 免费提交；外链类型未核实 | 200 |
| [Poki 开发者](https://developers.poki.com/guide/adding-your-game) | 收，原型也可以 | 要求接 SDK，并且**不允许外部请求**（[要求](https://developers.poki.com/guide/requirements-quality)），**和实时调用 OpenAI 冲突，大概率过不了** | 200 |
| [GameDistribution](https://gamedistribution.com/developers/) | 收，必须是完整的英文游戏，不能跳转到其他网站（[质量规范](https://gamedistribution.com/developers/quality-guidelines/)） | 发行分成模式；外链未核实 | 200 |
| [itch.io](https://itch.io/game/new) | 收，可以上传 HTML5 或填外链 | 免费；dofollow 未核实 | 403 |
| [Newgrounds](https://www.newgrounds.com/projects/games) | 收 HTML5 | 免费；未核实 | 403 |
| [Game Jolt](https://gamejolt.com/) | 收 | 免费；未核实 | 200 |
| [Y8](https://www.y8.com/upload) | 有上传入口 | 未核实 | 200 |
| GamePix、Armor Games | 未核实 | — | 403 |
**建议**：自己的网站是主战场，门户主要用来曝光和拿品牌外链。如果要上门户，就为门户单独做一个"演示版"（可以用预录的 AI 决策回放），并在游戏里链回主站，前提是门户规则允许。

**B. AI 工具目录**（各来源的价格说法有冲突，以提交页为准）
| 站点 | 免费/付费 | 链接类型 | 来源 |
|---|---|---|---|
| [There's An AI For That](https://theresanaiforthat.com/)（403） | 付费 $49；每月 X 讨论串可以免费上一个工具 | 来源称已核查的 listing 是 followed | [launchscaler](https://www.launchscaler.com/blog/ai-tools-directories-submit)、[yourhack](https://yourhack.ai/submit-your-tool) |
| [Toolify](https://www.toolify.ai/)（403） | $99 快速通道；有来源说有免费队列（2–4 周） | **说法冲突**：有来源称 followed，有来源称 nofollow | 同上 + [wheretosubmit](https://wheretosubmit.org/guides/ai-tool-directories) |
| [Futurepedia](https://www.futurepedia.io/) | 付费，约 $497 | nofollow，**不推荐用来做外链** | wheretosubmit、launchscaler |
| [Future Tools](https://www.futuretools.io/) | 免费 | 点击要经过跳转 | launchscaler |
| [Dang.ai](https://dang.ai/) | 有免费档，要求反链 | yourhack 称 followed；launchscaler 称点击要经过跳转 | 同上 |

**C. 首发站**
| 站点 | 免费/付费 | 链接类型（来源） |
|---|---|---|
| [Product Hunt](https://www.producthunt.com/) | 免费 | 来源未给出明确结论，未核实 |
| [Show HN](https://news.ycombinator.com/showhn.html) | 免费 | 大多是 nofollow（[dev.to 实测](https://dev.to/codelong888/is-your-launch-site-backlink-actually-dofollow-i-checked-24-platforms-1jb7)） |
| [BetaList](https://betalist.com/) | 只有付费 | followed（yourhack） |
| [Uneed](https://www.uneed.best/) | 免费队列 + 付费 | 免费档要拿到 20 个 upvote 才是 followed |
| [Peerlist Launchpad](https://peerlist.io/launchpad) | 免费 | FAQ 写只有每周前 5 名才给外链 |
| [DevHunt](https://devhunt.org/) | 免费 | 免费档 nofollow，付费是 dofollow |
| [SaaSHub](https://www.saashub.com/) | 免费 | 未核实 |
| [AlternativeTo](https://alternativeto.net/)（403） | 免费，可选 $5 | nofollow |

**D. Reddit**（curl 全部 403，是 Reddit 拦截脚本访问；先读版规，每个版只发一次，用"求反馈"的语气）
r/WebGames、r/playmygame、r/IndieGaming、r/SideProject、r/InternetIsBeautiful、r/artificial、r/OpenAI。Reddit 外链一般是 nofollow 或 ugc，主要价值是流量和被转发（这点没有单独核实来源）。

**E. X 和独立开发社区**：[Indie Hackers](https://www.indiehackers.com/)（200）、X 上的 #buildinpublic 和 AI 开发者圈；@ TypeSafe AI 和 Cloudflare 开发者账号时只做真实分享，不要刷屏。中文圈的 V2EX、即刻可以用来加快收录（哥飞的建议），但用户不在中文圈。

**F. 导航站和低价外链**：wheretosubmit 列了一批几美元的 dofollow 目录（如 See What New AI $2、Tap4 AI $10），来源见 [wheretosubmit](https://wheretosubmit.org/guides/ai-tool-directories)。按哥飞的标准，提交前先用 site: 查它最近 7 天有没有新收录，没有就跳过。

## 4. 怎么诚实地蹭 Jev / Decisions API / Clef 的热度
- 只给**真正接入了的模型**做对战页。现在只有 Decisions API；Jev 和 Clef 接入之后再上页面。
- 页面标题写成 "Human vs OpenAI Decisions API – Spot the Difference"，不要写成 "OpenAI Decisions API official…"。加一行声明：与 OpenAI/TypeSafe/Cloudflare 无隶属关系。
- 对战页内容用**自己的真实数据**：模型 ID、平均反应时间、对人类的胜率、样本量、统计日期。这是官方文档没有的信息，也是别人愿意引用的原因。
- 把对局统计作为数据发到 X 和 HN；在官方社区论坛只用开发者的身份分享"我用 Decisions API 做了个游戏"。
- 域名和 URL 里不要出现别人的品牌名（哥飞提到的品牌域名封站风险）。

## 5. 一屏限制怎么处理
- 每个页面一屏：H1、一句话介绍、主按钮（Play）、3–4 个内链卡片，大约 50–120 个词的独有文字。这些都必须在 SSR 的 HTML 里。
- SEO 内容拆到多个独立的一屏子页面：`/how-it-works`、`/rules`、`/about-the-ai`、`/models/*`、`/levels/*`、`/leaderboard`、`/results/*`。用面包屑和卡片串起来，保证每页都能在 3 次点击内到达。
- 不要用 `display:none` 或折叠起来的大段文字凑字数，这有隐藏内容的风险。可以用**用户主动点开的** `<details>` 放 FAQ，前提是展开后也不需要滚动（这一条按严格的不滚动要求，最好也拆成子页面）。
- 每一页都要有独有的东西（题图、关卡数据、模型数据），否则就是薄页。

## 6. KPI 和检查点（阈值是经验判断，不是统计数据）
| 检查点 | 看什么（GSC/Bing） | 合格线 | 不合格时怎么办 |
|---|---|---|---|
| D7 | site:域名 有结果；GSC 已编入索引的页面 ≥ 首页 + 2 个核心页；Bing 有抓取记录 | 首页已收录 | 用网址检查看渲染出来的 HTML；排查 robots 和 canonical；加 2–3 条有收录的外链 |
| D14 | 已编入索引的页面占提交页面的 ≥ 50%；出现第一批展示；**品牌词**（humanvsai）排第一 | 每天有展示 | 页面"已抓取但未编入索引"多，说明页面太薄，要合并或补独有内容 |
| D30 | 展示量周环比在上升；出现非品牌查询（spot the difference ai、human vs ai game、decisions api game 这类）；有 ≥ 10 个引荐域名，并且其中能被收录的占多数 | 有长尾词进到前 50 | 停止加新页面，集中补外链和内容质量；回去核查关键词意图 |
最先出现的查询通常是品牌词和模型长尾词（竞争小），"spot the difference online" 这类大词要更久。这是推断，没有数据支撑。每周导出 GSC 的查询，记到表格里。

## 7. 风险
- **薄页和重复页**：按关卡或模型批量生成的模板页可能被 Google 认定为规模化内容滥用（[Google 垃圾内容政策](https://developers.google.com/search/docs/essentials/spam-policies)）。每页都要有独有数据，没有就加 noindex。workers.dev 和正式域名的内容重复要用 301 解决。
- **AI 对手的披露**：明确写出对手是哪个模型、是不是实时调用、有没有做难度调整，不能用脚本冒充"真 AI"。排行榜要防刷分。
- **商标**：不要用官方 logo，不要暗示官方认可；声明无隶属关系。
- **成本和可用性**：上线后流量一大，API 费用会跟着涨。要设每日上限，额度用完时降级成回放模式，并且在页面上明确告诉用户。
- **门户规则**：Poki 等平台禁止外部请求，提交前先读规则。
- **付费外链**：哥飞建议不要买外链，也不要程序批量群发（年终分享会笔记）。目录的付费上架属于广告位，要分开看待。

## 来源
哥飞：[4700外链](https://mp.weixin.qq.com/s/SCPVciVQ0HJ5udq8ajuhiw) · [第一美元](https://mp.weixin.qq.com/s/wekpvfTjcs21ABoYguhGIw) · [抄作业案例](https://mp.weixin.qq.com/s/ubrlLR8K9SATXjyvSKdJdw) · [年终分享笔记](https://yuanchang.org/resources/going-global/misc-17-ge-fei-nian-zhong-fen-xiang-hui-zong-jie/) · [即刻解答](https://m.okjike.com/originalPosts/65b135379185c305d1eb7f87)
技术：[Cloudflare Crawler Hints](https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/) · [Google 应用 schema](https://developers.google.com/search/docs/appearance/structured-data/software-app) · [Google 垃圾内容政策](https://developers.google.com/search/docs/essentials/spam-policies)
渠道：[CrazyGames 技术要求](https://docs.crazygames.com/requirements/technical/) · [Poki 要求](https://developers.poki.com/guide/requirements-quality) · [GD 规范](https://gamedistribution.com/developers/quality-guidelines/) · [yourhack 对比](https://yourhack.ai/submit-your-tool) · [launchscaler](https://www.launchscaler.com/blog/ai-tools-directories-submit) · [wheretosubmit](https://wheretosubmit.org/guides/ai-tool-directories) · [dev.to dofollow 实测](https://dev.to/codelong888/is-your-launch-site-backlink-actually-dofollow-i-checked-24-platforms-1jb7)
