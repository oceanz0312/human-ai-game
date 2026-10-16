# 「Human vs AI 大家来找茬」SEO 选词 & 域名建议（2026-10-16）

## 0. 数据说明（重要）
- **Semrush 调用失败**：返回 `no_api_units`（API 额度不足）
- 因此本文**没有任何搜索量 / KD / CPC 数字**，下面的关键词分层是基于搜索意图和 SERP 常识做的定性判断，补到 API 单位后需要用 Semrush 复核。
- 域名可用性用 RDAP（rdap.org，各注册局 RDAP）+ Cloudflare DNS-over-HTTPS 的 NS 查询交叉验证（whois 43 端口在本机被墙）。

## 1. 关键词（定性，待 Semrush 复核）
| 层级 | 关键词 | 意图 | 判断 |
|---|---|---|---|
| 头部大词 | spot the difference, find the difference | 想玩 / 找图 | 量大但竞争激烈（老牌游戏站、App、图片站），新站难进前排，首页兼顾即可 |
| 主攻 | spot the difference online, spot the difference game, find the difference game, spot the difference online free | 想马上在线玩 | 交易型意图，H5 即开即玩完全匹配，首页主词 |
| 长尾 | spot the difference for adults, spot the difference puzzles, find 5 differences, hard spot the difference, spot the difference with timer | 细分玩法 | 竞争较低，用关卡/合集内页承接 |
| 差异化 | human vs ai game, beat the ai game, ai vs human, can you beat ai, spot the difference vs ai | 好奇、挑战 | 量小但几乎无直接竞品，是品牌词和传播钩子 |
| 慎用 | photo hunt game | 偏老街机怀旧 | 可做一个内页 |

## 2. 域名
### 可用性（2026-10-16 查询；RDAP 404 + DNS NXDOMAIN = 大概率未注册，可能有溢价价格，以注册商为准）
| 域名 | 结果 |
|---|---|
| spotthedifference.ai | 未注册（可能溢价）|
| spotthedifference.io | 未注册（.io 无 RDAP，仅 DNS 判断）|
| spotthedifference.game | 未注册 |
| spotthedifference.fun | 未注册 |
| spotdiff.ai / spotdiff.io / spotdiff.game / spotdiff.fun | 均未注册 |
| spotthediff.ai | 未注册 |
| findthediff.ai | 未注册 |
| humanvsai.game | 未注册 |
| aivshuman.game | 未注册 |
| beattheai.game / beattheai.fun | 未注册 |
| aispotdiff.com / spotdiffai.com | 未注册 |
| humanvsai.fun | **已注册** |
| findthedifference.ai | **已注册** |
| spottheai.com | **已注册** |
| spotthedifference.com / humanvsai.com | **已注册** |

### 子域名 vs 新域名
- 现有域名（作者已有的其他域名）主题与找茬无关，子域名（现有域名的子域名）只能继承少量权重，且无关键词与品牌价值；好处是零成本、马上上线。
- 新关键词域名：品牌记忆 + 分享海报上好看 + 标题点击率，长期更好。
- **推荐**：新买 **spotthedifference.ai**（若溢价过高则 **spotdiff.ai** 或 **spotthedifference.game**），备选品牌型 **humanvsai.game**。在 Cloudflare 注册后直接绑定 Workers。预算为零时先用 现有域名的子域名 过渡，换域时 301。

## 3. 落地页方案
- Title：`Spot the Difference Online – Can You Beat the AI? | Free Game`
- H1：`Spot the Difference: Human vs AI`
- Meta description：`Play spot the difference online free. Race a real AI to find the differences in 20 levels, climb the leaderboard and share your score. No download.`
- URL：`/`（主词）、`/levels/1`…`/levels/20`（每关可索引，标题如 "Spot the Difference Level 5 – Hard"）、`/hard`、`/for-adults`、`/find-5-differences`、`/human-vs-ai`、`/leaderboard`、`/how-to-play`
- 首页模块：首屏直接可玩 → "How it works（vs AI）" → 关卡网格 → 排行榜 → AI 胜率统计（独特内容）→ FAQ
- FAQ：Is this spot the difference game free? / Can you really beat the AI? / How does the AI find differences? / Are there hard puzzles for adults? / Does it work on mobile? / How many differences per level?
- 内链：每关页互链上下关 + 链回首页和难度合集；海报带域名与关卡 URL；FAQ 加 FAQPage schema，游戏加 VideoGame schema。
