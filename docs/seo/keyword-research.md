# 关键词调研（web.cafe SEO Agent 数据版）

> 来源：web.cafe SEO Agent 对话 https://seo.web.cafe/chat/c/5e28a88d8e5c4edea1ebc0d9e94f32a2 （Semrush 美国库 + 趋势数据，2026-10）。
> 与早期文件（spot-difference-game-seo.md / human-vs-ai-platform-seo.md / human-vs-ai-cold-start.md）冲突时，以本文件为准。

## 1. 关键词地图（US）

| 页面 | 主词 | 月搜索量 | KD | 趋势 / 备注 |
|---|---|---|---|---|
| `/`（首页） | find the difference game | 4,400 | 42.5 | 前十全是别站内页，无站点用首页做该词 → 新站机会 |
| `/spot-the-difference` | spot the difference game | 5,400 | 53.8 | 同页兼顾 spot the difference（18,100，头部大词） |
| `/find-the-difference` | find the difference | 9,900 | 48.6 | 换角度：规则/技巧/难度 |
| `/human-vs-ai` | human vs ai | 2,900 | 27.6 | KD 最低，但较峰值 -56%，只做一个内页 |
| `/games/spot-the-difference/levels/[n]` | 长尾：1–5 关 spot the difference level n / odd one out；6–12 关 hard spot the difference / with timer；13–20 关 expert / for adults | TBD | TBD | 2026-10-18 已按难度分档上线文案（见 seo-multilingual-architecture.md）；需独有数据，样本不足 noindex；量与 KD 待 Semrush 额度恢复后补 |
| 其他语言（/zh 等） | TBD | — | — | 后续单独调研 |

## 2. 不追的词
- spot the difference online（320/月，量太小）
- Jev、OpenAI Decisions API、Cloudflare Clef、gpt-6-luna：几乎无搜索；Jev 9 月 20 日那周见顶，现仅峰值 9%
- 原则：域名/URL 不放他人品牌名；不用官方 logo；页面如实写明对手模型并声明无隶属

## 3. 域名
- 后缀不影响 SEO；能注册哪个买哪个。社区唯一真实数据点：30 天 100 万 UV 的小游戏站用 .app
- 选定 humanvsai.app（尚未注册）；切换时 workers.dev 全路径 301
- 移动优先抓取：单一响应式站，不做 m. 子域

## 4. 一屏 vs 正文
- 哥飞本人已放弃「强求一屏」；SEO Agent 建议：首屏 = 游戏入口 + H1 + 演示动画，下方约 1,200 词正文 + FAQ 可滚动
- 当前决定：方案 A（所有页一屏，SEO 内容拆独立子页）；首屏与方案 B 兼容，日后可在落地页下方追加正文

## 5. 外链渠道
1. backlinkdirs.com 按 Free 标签铺满免费目录（如 aidirs.org，免费，DR39）→ 交换 → 付费（优先高 DR / 高流量）
2. 付费目录排除：Ahrefs 标 spam、月流量 <1k、搜索流量占比 <10%、DR<10、流量腰斩、出站链接过多、停留 <30s
3. Reddit：r/WebGames、r/playmygame、r/indiegames，标题「free, no signup, live AI opponent」
4. Product Hunt：真人感个人号，带真实数据发布
5. 游戏门户：CrazyGames / itch.io / Newgrounds 可发；Poki 不允许外部请求，和实时 AI 冲突

## 6. 来源
- web.cafe SEO Agent 对话：https://seo.web.cafe/chat/c/5e28a88d8e5c4edea1ebc0d9e94f32a2
- 哥飞：新站持续上内页 + 慢慢加外链 https://new.web.cafe/experience/wq0foj2fcy
- 新词窗口短（nlweb 案例）https://new.web.cafe/topic/l59vsea5uh
- Bing 批量提交 https://new.web.cafe/topic/r2ijh4rlfg
- .app 小游戏站 30 天 100 万 UV https://new.web.cafe/topic/vs1k9fojsk
- 导航站筛选标准 https://new.web.cafe/topic/z0gct1njcq
- backlinkdirs：https://backlinkdirs.com
- Google 结构化数据（软件/游戏）https://developers.google.com/search/docs/appearance/structured-data/software-app
- Google 垃圾内容政策 https://developers.google.com/search/docs/essentials/spam-policies
- Cloudflare Crawler Hints https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/
