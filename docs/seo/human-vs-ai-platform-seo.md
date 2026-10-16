# 人类 vs AI 游戏平台 SEO 方案（v2，2026-10-16）

定位：一个让人和 AI 比赛玩各种游戏的平台。MVP 只上线「找茬」（spot the difference）H5 游戏，面向海外、英文优先。现有地址：https://human-ai.zdychanges.workers.dev

> 数据说明：Semrush 再次返回 `no_api_units`（API 额度不足），**所以没有搜索量和关键词难度数据**。热度信号只有 new.web.cafe 已采到的数据，加上公开报道和文档。所有事实都来自下面列出的来源。

## 1. 名称核实

| 用户提的名字 | 官方实际叫法 | 发布方 / 时间 | 是否有人搜 |
|---|---|---|---|
| System One decision model | **System One model**，是一个类别名，不是某个具体产品。由 TypeSafe AI 提出，名字借用了卡尼曼"系统 1"的说法 | TypeSafe AI，2026-09-15（[博客](https://typesafe.ai/blog/introducing-system-one-models-and-jev)） | 有。dev.to、Kai Waehner 博客、GitHub 上的 sysone-bench 都把它当作类别词来写。没有搜索量数据 |
| JEV | **Jev**，TypeSafe AI 的第一个 System One 模型（版本 jev-1.13.0，API 路由 jev-latest）。名字来自经济学家 Jevons | TypeSafe AI，2026-09-15 | 有。web.cafe 数据：jev model 热度是 GPTs 的 1.46 倍，但已经跌了 34%，并且属于品牌词，官网排第一。另有多篇 arXiv 评测、LangChain 集成 |
| OpenAI Decision API | **Decisions API**（复数），接口是 `POST /v1/decisions`，模型只有 `gpt-6-luna` | OpenAI，DevDay 上预览，2026-10-06 开放公测（[文档](https://developers.openai.com/api/docs/guides/decisions)） | 有讨论：官方社区帖、StackOne 文章、openai-node 的 PR。没有搜索量数据。注意大家搜的是 "decisions api"，不是 "decision api" |
| Cloudflare 基于千问微调的模型 | **Clef**（基于 Qwen3.8-27B）、**Clef-flash**（基于 Qwen3.5-9B）、**Clef-omni**（基于 Qwen3-Omni-30B-A3B），都是开放权重的决策模型。Workers AI 上的 ID 是 `@cf/cloudflare/clef` 和 `@cf/cloudflare/clef-flash` | Cloudflare，Workers AI 上线日志日期是 2026-10-01（据 llmrumors 转述；Clef-omni 见 [Cloudflare 博客](https://blog.cloudflare.com/clef-faster-cheaper-multimodal/)） | 有报道，没有搜索量数据。具体上线日期是二手来源，建议以 Cloudflare 官方日志为准 |

另外，dev.to 一篇文章提到 Microsoft-Decision-1（基于 Qwen3.5-9B，10-09 发布），**这只有单一来源，未核实，暂时不做页面**。

**SEO 判断**：这几个都是开发者 API 词，搜这些词的人想看文档和价格，不是想玩游戏，官网会稳占第一。所以不要把它们当主词，而是做「AI 对战页」去吃长尾词，比如 "jev vs human"、"can openai decisions api play games"，再用来做社媒和外链话题。真正有用的是：这几个模型都是秒级以下出结果的"快决策"模型，天然适合做"人类反应速度 vs AI"的实时对战，这也是很好的卖点。

## 2. 关键词与页面

### 关键词分层（意图判断，没有量化数据）
- **平台词（首页）**：human vs ai game(s)、play against ai、beat the ai、ai vs human challenge、can you beat ai、human vs machine games
- **找茬词（游戏页 + 内页）**：spot the difference online / free / game、find the difference game、spot the difference puzzles、spot the difference for adults、spot the difference hard，以及 "spot the difference vs ai" 这类差异化词
- **模型对战词（/models/*）**：jev vs human、openai decisions api game、gpt-6-luna vs human、cloudflare clef demo、system one model demo
- **信息词（/learn/*）**：what is a system one model、how does ai spot differences、ai vs human reaction time

### URL 结构
```
/                          平台首页
/games/spot-the-difference 找茬游戏（MVP）
/games/spot-the-difference/level-1 … level-20   每关一个可收录页面
/games/spot-the-difference/hard | /for-adults | /free   意图落地页
/models/                   AI 对手列表
/models/jev  /models/openai-decisions-api  /models/cloudflare-clef  /models/gpt-6-luna
/leaderboard               排行榜
/learn/system-one-models  /learn/how-ai-spots-differences
/games/<future-game>       后续新游戏占位（不上线前不要建空页）
```

### 各类页面的 Title 和 H1
| 页面 | Title | H1 |
|---|---|---|
| 首页 | Human vs AI Games – Can You Beat the AI? | Play Games Against Real AI |
| 找茬 | Spot the Difference Online – Beat the AI (Free) | Spot the Difference: You vs AI |
| 关卡页 | Spot the Difference Level 7 – Human vs AI | Level 7: Find 5 Differences Before the AI |
| 意图页 | Hard Spot the Difference Puzzles for Adults – vs AI | Hard Spot the Difference Puzzles |
| 模型页 | Jev vs Human: Play Spot the Difference Against TypeSafe's Jev | Can You Beat Jev? |
| 模型页 | OpenAI Decisions API vs Human – Live Game Battle | You vs OpenAI Decisions API (gpt-6-luna) |
| 模型页 | Cloudflare Clef vs Human – Spot the Difference Battle | You vs Cloudflare Clef |
| 学习页 | What Is a System One Model? Jev, Decisions API & Clef Explained | What Is a System One Model? |

注意：只有游戏里真的接入了某个模型，才能建对应的模型页。现在游戏调用的是 OpenAI，如果后端不是 Decisions API，就要么先接入，要么在页面上如实写清楚，否则属于误导。

### 一屏不滚动的写法
- 每页固定版式：H1、一句 40–60 词的介绍、主按钮（Play）、3–6 个链接卡片（相关关卡、模型、学习页），外加一行面包屑和页脚链接。
- 用纯 HTML 的 `<details>` 或 CSS 标签页放 FAQ 和规则。内容要直接写在 HTML 里，不要靠 JS 点击后再加载，这样搜索引擎能抓到，屏幕上默认折叠。
- 游戏画布本身靠 JS 渲染，但 Title、H1、介绍、链接必须是服务端输出的静态 HTML（可以用 Workers 做 SSR 或预渲染）。
- 每个关卡页加上独特信息：题图的 alt 文字、AI 用了几秒、人类平均用时、通关率。这样内容不会重复，也有可以加结构化数据的数字。
- 结构化数据：首页用 WebSite 和 Organization，游戏页用 VideoGame（或 Game），学习页用 FAQPage 和 Article。
- 移动端优先，桌面端两栏排版，字数也能多放一些。

### 这条约束在 SEO 上的取舍
- 缺点：单页文字少，信息量偏薄，主词 spot the difference online 很难靠单页内容去拼大站；页面多、内容少，有被判为低质量或薄内容的风险。
- 弥补办法：靠页面数量和独特数据（每关有不同的数据），加上合理的内链和折叠但可抓取的 FAQ。不要批量生成几乎一样的页面，参考豆包那次的教训。
- 好处：加载快、Core Web Vitals 好，用户一进来就能玩，跳出率低、停留时间长，这些互动信号对排名有帮助。

## 3. 域名

查询方法：RDAP（rdap.org）。返回 404 表示注册局没有这条记录，大概率可以注册；返回 200 表示已被注册。box 上没有 dig，所以没做 DNS 交叉核对。是否属于溢价域名，要在注册商那里看价格。

| 域名 | RDAP 结果 | 结论 |
|---|---|---|
| humanvsai.game | 404 | 可注册 |
| humanvsai.gg | 404 | 可注册 |
| humanvsai.io | 404 | 可注册 |
| humanvsai.app | 404 | 可注册 |
| aivshuman.game | 404 | 可注册 |
| beattheai.game | 404 | 可注册 |
| beattheai.gg | 404 | 可注册 |
| vsai.game | 404 | 可注册（很短，可能是溢价域名） |
| humanvsmachine.game | 404 | 可注册 |
| humanvsai.ai / humanvsai.com / humansvsai.com | 200 | 已被注册 |
| outplayai.com / playvsai.com / beattheai.com / outplay.ai / humanvs.ai | 200 | 已被注册 |

**推荐前三**
1. **humanvsai.game**：和平台词完全一致，`.game` 后缀直接说明是游戏，后面加新游戏也不会被名字限制。
2. **humanvsai.gg**：品牌感更强，游戏圈熟悉 .gg，适合排行榜和社交分享。可以同时注册，301 跳到第 1 个。
3. **beattheai.game**：对应 "beat the ai" 这个行动型关键词，适合做口号和投放落地页。

现有域名（作者已有的其他域名）和主题无关，挂子域名几乎拿不到主域的权重，不建议用。
