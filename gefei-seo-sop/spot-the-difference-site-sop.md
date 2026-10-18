# 找茬站（Human vs AI）SEO 方案 SOP

> 整理日期：2026-10-18（东京时间）。依据：new.web.cafe 原帖 + 哥飞 SEO Agent（[对话](https://seo.web.cafe/chat/c/91e1c473b9354599badcc1293b9c8703)）+ Cloudflare 官方报价 + 各模型官方定价。数据均来自来源，未编造。

## 1. 结论
做，但定位为**长期找茬游戏站**，「人机对战」是产品特色，不是 SEO 卖点，也不当域名。

## 2. 关键词（美国月搜，Google 规划师，KD 为哥飞版）
| 关键词 | 月搜 | KD | 第 1 名 | 最弱竞品 |
|---|---|---|---|---|
| spot the difference | 18,100（-23%） | 39.4 / 常规 50.1 | spotthedifference.com DR41（2002 注册） | spot-differences.com DR12 |
| find the difference | 9,900（-32%） | 48.6 | play.google.com DR100 | gamesnacks.com DR54 |
| spot the difference game | 5,400 | 53.8 | play.google.com DR100 | eslkidsgames.com DR36 |
| ai or human | 8,100 | 52.2 | humanornot.so DR41 | humanornot.io DR3（聊天猜真人，方向不同，不做） |
| real or ai | 3,600 | 48.1 | sightengine.com DR68 | britannicaeducation.com DR59 |
| human vs ai | 2,900（-56%） | — | — | 只当品牌标签 |
| human vs ai game / ai vs human game / spot the difference ai | 170 / 210 / 20 | — | — | 几乎无量 |

## 3. 域名
- 选定：**spotthedifferencegame.com**（Cloudflare $10.46/年，续费同价，完全匹配 .com）。
- 备选：spotthedifference.io（$32 首年/$50 续费，哥飞 Agent 首推）、spot-the-difference.app（$8.2/$14.2，带连字符且与 2026-07 注册的 spot-the-difference.com 撞名）、find-the-difference.com（$10.46）。
- 不用 humanvsai.app。
- 哥飞原话：「我们用关键词注册域名，其实并不仅仅只是为了 EMD，我们配套操作是用关键词当品牌名，最终目的是让谷歌认为，用户要找的其实是我们的网站」（[为什么要用关键词注册域名](https://new.web.cafe/tutorial/detail/9la0387wu1)）。

## 4. 首页与内页
- 首页 Title/H1 只打 **spot the difference**，首屏即游戏；「Solo / vs AI」做模式切换，不建页、不进 H1。
- URL 结构参考哥飞拆 crazygames：/c/分类、/t/关键词聚合、/game/详情。
- 首批内页：/spot-the-difference-printable（1,300，KD 22.2）、/find-the-differences（KD 38.7，前十全是内页）、/spot-the-difference-pictures（2,900，KD 42.3）。
- 之后：hard（880）、free（1,900）、for adults（320）、easy（320）。
- 节日页：christmas（2025-12 冲到 3,600，**11 月前上线**）、halloween（2025-10 冲到 4,400）。
- 不建页：answers（10）、video（70）、multiplayer（10）。

## 5. 人机对战的作用
- 对搜索流量几乎没帮助（相关词月搜 10–210）。
- 对粘性有帮助：拉停留、人均页数、降跳出（盘面弱站体验分仅 0 和 33，平均停留约 26 秒）。哥飞：多放游戏是为了「增加用户互动数据，延长用户停留时间，降低跳出率」。
- 适合传播：「输给 AI」截图；humanornot.io 靠 TikTok，2026-08 访问 59.9 万。
- **对战免费开放**，不做订阅锁。

## 6. 外链
- 先做 25–40 个引用域；首页进前十需 40–80 个；printable 需 20–40 个。
- 哥飞（12 群 2026-06-11）：「分析一个网站就能得到 10 个（外链资源），你分析 100 个网站，不就可能得到 1000 个。有了 1000 个，你冷启动小游戏站完全足够了。」
- 张瑜：外链域名到 200–300 个时会慢慢排到首页（[原帖](https://new.web.cafe/topic/ius2pog9kv)）。
- 外链筛选标准见记忆：非 spam、DR≥10、月流量≥1000、搜索流量占比≥10%、真链接。

## 7. 变现
- 主：AdSense，只放 banner / native banner，不放 popunder、social bar（[哥飞 Adsterra](https://new.web.cafe/experience/czv4otl4fm)）。排名稳定后再挂广告（[袁锐钦](https://new.web.cafe/topic/6eb3qa65ym)：刚到第一加横幅掉排名）。
- 辅：会员 = 去广告 + 高难度 AI，参考月 $9 / 年 $69 / 终身 $199；终身比年费好卖，订阅约占 10–30%（[广告站加一档会员](https://new.web.cafe/experience/ktbkg8gzmp)）。先跑广告，有留存数据再搭支付。
- 收入预期：平均约 $5 / 千次访问，美加英最高 $13.45；10 万访问 ≈ $500/月，月入 $1 万需约 200 万访问（[一个网站5个月的收入](https://new.web.cafe/tutorial/detail/ixsok5mmfm)：H5 小游戏站 5 个月 4.5 万美元）。
- 对比：「一天 1000 用户的订阅站 5000 刀起步，1 天 1000 的游戏站 几百刀」。

## 8. AI 对手的 API 成本（100 万访问/月，150 万局）
| 做法 | 月成本 |
|---|---|
| 代码模拟 AI（离线标好不同点坐标 + 难度曲线 + 随机失误） | ≈ $0 |
| 只传坐标，每个不同点调一次 Jev（$0.042/M）或 Clef-flash（$0.038/M） | $5–160 |
| 每 3 秒调一次 | 约 $1,100–1,300 |
| 每局把两张图发给看图模型 | 贵 3–6 倍，gpt-5-mini 高档 $19,000 |
- 建议：第一版代码模拟；要「对战 Jev」噱头就只传坐标调用。价格来源：[Jev](https://docs.typesafe.ai/models)、[Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)、[OpenAI Decisions](https://developers.openai.com/api/docs/guides/decisions)。

## 9. 扩展到其他游戏
- 哥飞：「一个游戏=一个关键词，一个关键词=一个网站，举全站之力做好这个关键词，更容易拿到排名」；「如果主词都还没站稳脚跟，你去横向扩展，那就不合适」。
- 找茬细分（难度、主题）→ 子目录；强相关（hidden object）→ 主站有权重后子目录；无关玩法（五子棋、数独）→ 新玩法词域名。
- 子域名会被谷歌当独立网站（[再聊多语言](https://new.web.cafe/topic/1HGs68bskee5TYwdEE7gXF)）。
- **不要自己的站互链**（哥飞：「群里朋友吃过亏，不建议自己的站互链」），导流用产品内推荐（玩完弹「试试人机五子棋」）；多站内容、品牌、Logo 要区分。
- 后续游戏优先级：找茬变体 > hidden object（33,100，+32%）> odd one out（12,100，-29%）；别碰 cool math games、snake game、crazy games。

## 10. 时间线
- 本周：注册域名，上线首页 + printable + find-the-differences，接 GSC/GA。
- 第 2–4 周：主题/形态内页，建外链资源池。
- 第 2–3 个月：内页扩到 30–50 个；11 月前上圣诞页。
- 第 4 个月起：加 hidden object。

---

## 11. 定稿方案（2026-10-18 用户批准，取代上文冲突处）

> 来源：哥飞 SEO Agent 冷启动方案（[对话](https://seo.web.cafe/chat/c/52a334f7d6674f9d8eb16fae3c121d3b)）+ Young 在对话中的决定。参考：[1](https://new.web.cafe/tutorial/detail/feoogz15ou) [2](https://new.web.cafe/tutorial/detail/2huov8xc6e) [3](https://new.web.cafe/tutorial/detail/c8z1ixs1md) [4](https://new.web.cafe/tutorial/detail/bcx02ezpp5) [5](https://new.web.cafe/tutorial/detail/omc9j2auz8) [6](https://new.web.cafe/tutorial/detail/lk5cbjbo9u) [7](https://new.web.cafe/tutorial/detail/k2z73gxq2h)

### 11.0 定位
- 域名 **spotthedifferencegame.com**（2026-10-18 在 Cloudflare 注册，$10.46/年，自动续费）。第一个站 = spot the difference 完全匹配域名（EMD）单游戏站，不是 gameagainstai.com，也不是多游戏 hub。
- 品牌 = 关键词：**Spot The Difference Game**。
- **只做英文**：/zh 全部 308 到英文同名页，hreflang 只留自身 + x-default，sitemap 只列英文。
- **AI 对手用代码模拟**（用户已批准，取代「真实 AI」规则）：保留对战体验（字幕、锁定、揭晓、特效），按关卡给出合理的用时/准确率，偶尔答错；保留模型适配层，真实 OpenAI 路径用开关关闭，以后可以再开。文案不能声称是真实模型。
- 多游戏平台 hub 保留在 /games，**不是首页**，且暂时对爬虫不可见（noindex,nofollow + X-Robots-Tag，robots Disallow，sitemap 不列，无可爬内链）。

### 11.1 关键词（美国月搜，哥飞 KD）
| 词 | 月搜 | KD | 页面 |
|---|---|---|---|
| spot the difference | 18,100 | 39.4 | `/` |
| find the difference | 9,900 | 48.6 | `/find-the-difference` |
| spot the difference game(s) | 5,400 | 53.8 | `/spot-the-difference-game` |
| spot the difference printable | 1,300 | 22.2 | `/printable` |
| find the differences | — | 38.7 | 并入 `/find-the-difference`（同义，不另建页） |
| spot the difference pictures | 2,900 | — | `/pictures` |
| christmas spot the difference | 季节词 | — | `/christmas`（**11 月前上线**） |
| play against computer 等 vs AI 词 | ~50 | — | 不当主词；AI 只做卖点和留存 |

### 11.2 页面结构（一词一页，参考 checkersonline.io）
- `/`：spot the difference，**首屏可直接玩**。
- `/spot-the-difference-game`：spot the difference game。
- `/find-the-difference`、`/how-to-play`。
- 难度页：`/easy`、`/hard`、`/for-kids`。
- `/printable`、`/pictures`、`/christmas`。
- 人机对战作为比赛模式，在 description 和 FAQ 里提。

### 11.3 页面细节
- Title 示例：`Spot the Difference – Play Free Online | Spot The Difference Game`。
- description 第一句带「take on the AI」。
- JSON-LD：VideoGame + FAQPage；FAQ 包含「Can I play spot the difference against AI?」。
- 品牌在 6 处保持一致：header、meta title、footer、结构化数据、meta 标签、外链锚文本。
- 首页多用需求词，少用品牌词。
- AdSense：静态 HTML 广告位（不用 JS 注入），只放 banner / native，不放 popunder。
- 每页内容独一无二（2026-06 垃圾内容更新）。
- sitemap、robots、canonical、hreflang（先只英文）、Core Web Vitals、移动端。
- 然后提交 GSC 和 Bing（API 批量）。

### 11.4 30 / 60 / 90 天
- 0–30 天：尽快上线；用目录站和博客评论做外链。
- 30–60 天：50–60 个引用域，DR 26–28；目录站按筛选标准挑选；外链匀速增长。
- 60–90 天：诊断三件事：页面相似度、外链增速、用户行为。

### 11.5 红线
- 主词没站稳之前不横向扩展；首页首屏永远是 spot the difference。
- 第二个站做 checkers（checkersgame.io / onlinecheckersgame.com，**都还没买**）；第三个站做 connect 4 或 battleship online（KD 31.3）。
- 自己的站之间**不互链**（只允许 nofollow 或爬虫不可见的 UI 链接）；hub 站以后再做。
- 无关新词（Krillion、Kanto Tactics）不放这个站。

### 11.6 不替 Young 做的事
- 任何购买、付费外链、对外发消息。
- 需要注册账号或付费的目录站提交，先列清单交给 Young。
- GSC / Bing 提交、AdSense 申请（都要 Young 本人账号）。

### 11.7 实施对照（代码仓库 oceanz0312/human-ai-game）
| 方案条目 | 实现 |
|---|---|
| 英文单语 | middleware 把 `/zh/*` 308 到英文同名页；`locales` 公开只留 en；sitemap 和 hreflang 只英文；游戏页固定英文 |
| 品牌 6 处 | `src/config/site.ts` 定义 `SITE_NAME = "Spot The Difference Game"`，header、footer、JSON-LD、OG、title 模板统一引用 |
| 首屏可玩 | `/` 首屏是免费试玩盘（第 1 关，本地模拟 AI，不占每日次数），玩完进入 20 关正式局 |
| 模拟 AI | `src/models/adapters/simulated.ts`；开关 `AI_MODE=simulated`（默认）/ `live`；页面名称叫「Luna AI」，标注为游戏内模拟 AI |
| 新页面 | `src/app/[locale]/{spot-the-difference-game,easy,hard,for-kids,printable,pictures,christmas}`；`/spot-the-difference` 308 到 `/` |
| /games hub | noindex,nofollow + `X-Robots-Tag`；robots `Disallow: /games$`；sitemap 不列；导航和页脚不放链接 |
| AdSense | `AdSlot` 静态占位（`data-ad-slot`，无脚本、无 publisher ID） |
| 域名 | Worker custom domain：apex + www（www 301 到 apex）；`*.workers.dev` 301 到新域名；`NEXT_PUBLIC_SITE_URL` / `PUBLIC_BASE_URL` 指向新域名 |
| 每日 3 局 | 保留（localStorage 随机 ID），只作用于完整 20 关；首页试玩盘不受限制 |
