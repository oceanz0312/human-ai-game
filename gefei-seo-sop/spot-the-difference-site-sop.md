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
