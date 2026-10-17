# Web 优先 + 像素风设计系统改造方案（待拍板）

> 状态：**只有方案和草图，没改仓库代码，没开 PR，也没部署。** 你确认后再按下面的 PR 顺序动手。
> 草图：`/workspace/proposals/web-first-sketches/*.png`。源码在 `src/`，是纯 HTML/CSS，同一份文件响应式地渲染桌面和手机两版。

## 0. 结论先行

- 站点从「402px 居中的 H5 长条」改成 **Web 优先**：桌面是主场，平板和手机做降级适配。旧 UI 和旧排版全部不保留。
- 顺序按你说的走：**阶段 1 先改响应式骨架，阶段 2 再引入像素风设计系统**。整体规范用 StyleKit Pixel Art；组件用 8bitcn/ui（shadcn 的 8-bit 版）；AI 面板参考 asciicn 做成 ASCII 终端风。
- 游戏页（对局、揭晓）在所有尺寸下都**严格一屏、不滚动**。首页和 SEO 内容页建议在桌面改为**首屏自成一体、下面可以滚动**（方案 B），这条需要你拍板。
- 路由、i18n 和 SEO 结构**一个都不动**（根路径英文、`/zh/`、关键词页、`/games/<slug>/play|levels|leaderboard`、`/ai-opponents/luna`），只换布局和皮肤。

## 1. 现状盘点（main @ f3f882a）

| 类别 | 现状 |
|---|---|
| 样式 | 只有一个 `src/app/globals.css`（1867 行）。CSS 变量很少，没有 Tailwind，没有组件库。`--board-size` 写死 ≤394px，所有页面套 `.mobile-shell`（窄列）+ `html.one-screen-app`（锁滚动） |
| 页面 | `[locale]/page.tsx`（首页）；`games/spot-the-difference/play`、`levels/[n]`、`leaderboard`；`(game)/play/[sessionId]`（对局）、`result/[publicId]`（结算）、`share/[publicId]`（分享 + OG）；内容页 `spot-the-difference`、`find-the-difference`、`human-vs-ai`、`how-to-play`、`faq`、`about`、`ai-opponents(/[model])`、`games`、`privacy`、`terms` |
| 游戏组件 | `GameScreen`（状态机：倒计时 → 对局 → 提交 → 揭晓）、`GameBoard`（栅格图 + 透明按钮网格）、`GameHeader`（关卡 + 3 个圆点）、`AiDanmakuLane`、`AiActivityPanel`、`DetailsSheet`（底部抽屉）、`LevelReveal`、`RevealHeatmapBoard`、`AiRevealInsights`、`VsRaceBar`、`ResultSummary`、`ShareActions`、`Leaderboard`、`HomeRaceAnimation`、`StartButton` |
| 站点组件 | `SiteTop`（品牌 + 语言切换，**没有导航**）、`InfoPage`（内容页模板）、`LocaleBanner`、`Analytics` |
| 关卡图 | `public/levels/v1/01–20.png`，1080²。第 1–5 关是 3×3，第 6–20 关是 9×9。**这张图和 AI 收到的输入逐字节一致**，皮肤不能改图本身 |

桌面上的主要问题：9×9 关卡在 394px 的格子里每格只有约 40px，桌面大屏完全没用上；AI 活动藏在抽屉里；没有全站导航；内容页像手机页被放大。

## 2. 断点与容器

| 名称 | 宽度 | 用途 |
|---|---|---|
| mobile | `< 768px` | 单列；顶栏改为汉堡菜单；对局 HUD 压成一行 |
| tablet | `768–1023px` | 对局仍是两栏，侧栏收窄到 300px；内容页两列卡片 |
| desktop | `≥ 1024px`（主设计尺寸 1440×900，兼顾 1280×720） | 完整导航；对局左边大棋盘，右边侧栏 |
| wide | `≥ 1440px` | 只是留白变多，不再放大 |

- 内容页容器 `--container: 1200px`，游戏页容器 1280px。正文行宽 ≤ 70 个字符（约 720px）。
- 用 `svh` 而不是 `vh`（手机浏览器工具栏）。高度断点 `max-height: 720px` 时进入紧凑模式。

## 3. 全站框架（三种壳）

1. **SiteShell**（首页 + 内容页 + 排行榜）：顶部导航高 64px（手机 52px）。
   - 左边是 Logo「HUMAN VS AI」（像素字）。
   - 中间导航：游戏 / 排行榜 / AI 对手 / 怎么玩 / FAQ。
   - 右边：语言切换（EN | 中文）和「开始挑战 ▶」主按钮。
   - 手机端导航收进汉堡菜单（8bitcn Sheet）；底部有深色页脚。
2. **GameShell**（对局 / 揭晓 / 倒计时）：细导航，只有 Logo、面包屑（游戏 / 大家来找茬 / 第 07 关）、语言和「退出」，没有页脚，`overflow: hidden`。
3. **ResultShell**（结算 / 分享）：SiteShell 的导航加上一屏卡片布局。

## 4. 逐页布局

### 4.1 首页 `/`（草图：home-desktop-1440x900.png、home-desktop-1440-fullpage.png、home-mobile-390x844.png）
- **桌面首屏**左右两栏：
  - 左栏：LIVE 徽章、「大家来找茬」、H1「你能比 AI 更快找到不同吗？」（60px 像素字）、副文案、「开始挑战 ▶ / 怎么玩」、三条事实（真实 AI 实时作答 / 人人同一套题 / 免注册）。
  - 右栏：**YOU VS AI 小窗**，也就是竞赛动画的像素版。3×3 小棋盘上「你」和「AI」两个光标在抢那一格，下面是分段进度条和你的用时。
- **首屏以下**（方案 B，需你拍板）：游戏货架（大家来找茬 + 2 个「更多游戏·筹备中」虚线占位，体现平台定位）、怎么玩三步、FAQ、页脚。这些内容正好对应 SEO 文档里的正文需求。
- **手机**：首屏装下徽章、H1、副文案、事实和横排小窗（小棋盘 + 进度条），「开始挑战 / 怎么玩」固定在底部；下面的内容可以滚动。
- 动画用 `steps()` 硬切，不用缓动（StyleKit「状态机，不是动画引擎」）。`prefers-reduced-motion` 时只显示静帧。

### 4.2 对局页 `/play/[sessionId]`（草图：play-desktop-1440x900.png、play-mobile-390x844.png）
- **桌面**：`grid-template-columns: var(--board) 380px`，整体居中。
  - 左栏从上到下：**安静的细弹幕道**（28px 高，虚线分隔，只写 AI 的真实网络步骤）→ **大棋盘** → 64px 底部行（提示「点击不同的那一格 · 9×9」+ 键盘提示 `Esc` 退出）。
  - 右侧栏：
    1. HUD 卡：关卡 `07/20`、剩余时间 `4.8 秒`（48px 像素数字 + 分段条，最后 1 秒变深红）、「机会」方块 ■■□（**措辞待定，见第 10 节**）。
    2. 对阵卡：你「作答中…」/ AI「等待 Worker 响应」。只显示状态，**不画假进度**。
    3. **AI 终端**（ASCII 风，常驻）：`[ok]` / `[..]` 加毫秒时间戳，逐行写真实步骤：准备请求 → 决策凭证 → 发送至 Worker → 图像 sha256 确认 → 等待响应（非模拟思考）。底部注明「真实调用 · 真实速度 · 对局中不显示答案」。沿用现有过滤规则，不输出 r#c#，也不输出概率。
- **棋盘尺寸公式**（桌面）：`--board = min(100svh − 导航 − 上下边距 − 弹幕道 − 底部行, 100vw − 侧栏 − 边距, 760px)`。1440×900 时约 680px，1280×720 时约 500px，比现在的 394px 大约 25%–75%。
- **手机**：
  - 从上到下：细导航、一行 HUD（关卡 | 大号计时 | 机会）、弹幕道、满宽棋盘、底部行（提示 + 「AI 详情 ▴」）、对阵卡、终端最后 3–4 行。
  - 点「AI 详情」打开完整终端抽屉。
  - 高度 ≤ 720px（例如 375×667）时隐藏对阵卡，终端只留 2 行。已验证 375×667 也是一屏。
- AI 是真实的、按真实速度作答，不自动推进，这些机制都不变。键盘：`Esc` 退出（会二次确认）。

### 4.3 揭晓（草图：reveal-desktop-1440x900.png、reveal-mobile-390x844.png）
- **棋盘和对局页同尺寸、同位置**：DOM 结构和尺寸公式完全一致，从对局切到揭晓时图片不会跳。**「下一关 ▶」就在棋盘正下方**，占用对局页底部行的位置，宽度和棋盘一样，桌面支持 `Enter`。
- 棋盘叠层：
  - 蓝色色块表示 AI 把握度热力。
  - 实线蓝框是 AI 的选择，绿色虚线是答案。
  - 「AI」「你」标签贴在格子上。
- 桌面侧栏：
  1. 结论卡：「你更快！」、一句解释、你和 AI 用时对比条、「本局已有 3 关比 AI 快」。
  2. 「AI 决策时间线」终端回放：包括 Worker 响应、top-3 候选 `r2c8 ▓▓▓▓▓▓▓▓░░ 82%`、答案已锁定 → 正确，底部是图例。
- 手机：顶部 52px 结论条（和对局页 HUD 等高，所以棋盘位置也一致）→ 弹幕 → 棋盘 → 下一关 → 用时对比 → 时间线末尾几行。
- AI 晚到时继续轮询补数据，这个逻辑不变。

### 4.4 结算 `/result/[publicId]`，分享页 `/share/[publicId]`
- 桌面两栏，一屏：
  - 左边成绩卡：到达关卡、比 AI 快几关、总用时、像素大字标题、「再来一局 / 分享」。
  - 右边：分享海报预览（像素主题）和本周排行前 5。
- 手机单列，主按钮固定在底部。
- 分享海报 `lib/poster.ts` 和 OG 图的换皮放到阶段 2 的最后一个 PR。

### 4.5 排行榜 `/games/spot-the-difference/leaderboard`
- 容器 960px，8bitcn Table：排名 / 玩家 / 到达关卡 / 比 AI 快 / 时间。前三名用黄、浅灰、橙色块。上方用 Tabs 切「今日 / 本周 / 全部」（**只在接口支持时才做**）。
- 手机端表格收成卡片列表。这一页本来就是 SEO 页，允许滚动。

### 4.6 SEO 内容页（`/spot-the-difference`、`/find-the-difference`、`/human-vs-ai`、`/how-to-play`、`/faq`、`/about`、`/ai-opponents/luna`、`/games`、`levels/[n]`、`privacy`、`terms`）
- 桌面：
  - 首屏 Hero：左边 H1、要点和「开始挑战」；右边游戏截图或小窗。
  - 下面：正文 720px 列 + 右侧粘性 CTA 卡（开始挑战 / 当前关卡统计）。FAQ 用 Accordion，关卡页用网格卡片，最后是页脚。
- 手机单列，CTA 固定在底部。
- **建议**：桌面和手机都采用方案 B（首屏自成一体，正文在下面滚动）。理由：
  1. Web 优先之后，桌面上一屏塞不下 SEO 正文。
  2. 哥飞 SEO agent 也建议放弃强一屏。
  3. 游戏页本身仍然严格一屏，玩的时候不受影响。
- **这条会改动「每页一屏」的既有规则，必须你拍板。**

## 5. 设计 Token（可替换主题层）

全部写成 CSS 变量，阶段 2 映射进 Tailwind `@theme`。以后换主题（比如暗色）只改这一层。

### 5.1 色板（PICO-8 底色，已修对比度）
| Token | 值 | 说明 |
|---|---|---|
| `--c-ink` | `#1a1c2c` | 正文、边框、硬阴影 |
| `--c-paper` / `--c-surface` | `#f4f4f4` / `#fff` | 页面底 / 卡片 |
| `--c-text-2` | `#5f574f` | 次要文字（6.4:1） |
| `--c-muted` | `#6b6560` | **修正**：原 `#8b8680` 只有 3.3:1，改后 5.2:1 |
| `--c-human` / `--c-human-text` | `#ff004d` / `#c8003c` | 「你」：红色只用作色块，浅底上的文字用深红 |
| `--c-ai` / `--c-ai-text` | `#29adff` / `#0a6abf` | 「AI」：蓝色色块配深色字（6.8:1），浅底文字 5.5:1 |
| `--c-cta-bg` / `--c-cta-fg` | `#c8003c` / `#fff` | **修正 StyleKit 白字红底**：`#fff`/`#ff004d` 只有 3.92:1，不达 AA；改成 `#c8003c` 后 5.96:1 |
| `--c-cta-hover` | `#7e2553` | Palette Swap 硬切（9.2:1） |
| `--c-ok` / `--c-warn` / `--c-hi` | `#00e436` / `#ffa300` / `#ffec27` | 全部配深色字（9.8 / 8.4 / 13.9:1） |
| `--c-term-bg` / `--c-term-fg` / `--c-term-dim` | `#1a1c2c` / `#c2c3c7` / `#83769c` | 终端 |

规则：彩色背景上不放灰字；状态不只靠颜色区分（同时有 `[ok]`、✓、标签文字）。

### 5.2 字体
| 角色 | 字体 | 规则 |
|---|---|---|
| 英文展示（Logo、数字、英文标题） | Press Start 2P（OFL） | 只用于短文本；德语、法语等长词注意宽度 |
| 中文展示（标题、按钮、标签） | **Fusion Pixel 12px 简中**（OFL，TakWolf） | 只用 12/24/36/48/60px（12 的整数倍才清晰），关闭字体平滑 |
| 正文 | Noto Sans SC / PingFang SC / system-ui | **长段落不用像素字**，保证可读性 |
| 终端 | JetBrains Mono，中文回退到 Fusion Pixel | 不引入 asciicn 依赖的 Meslo Nerd Font（太重） |

Fusion Pixel 简中完整文件 680KB，上线前必须**子集化**：按站内实际用到的字生成，预计小于 80KB，用 `unicode-range` 分片，`font-display: swap` 加 `size-adjust` 防止布局跳动。

### 5.3 形状、阴影、间距、动效
- 圆角一律 0；边框 4px（小元素 2px）；硬阴影 `2/4/6px` 偏移、纯 ink 色，**不用柔和阴影和渐变**。
- 按钮：hover 位移 2px、阴影变 2px；active 位移 4px、阴影消失（位移等于阴影偏移）。focus 用内描边 `inset 0 0 0 3px var(--c-ai)`。
- 间距 4px 栅格（4/8/12/16/24/32/48/64）。
- 动效：状态切换硬切；闪烁光标用 `steps()`；倒计时只在最后 1 秒变色。`prefers-reduced-motion` 时关掉动画。
- 揭晓热力图用半透明蓝色块。这是数据可视化，算 StyleKit「禁透明过渡」的例外，可以接受。

## 6. 组件清单 → 8bitcn 映射

| 我们的组件 | 8bitcn / 来源 | 备注 |
|---|---|---|
| 主/次按钮、StartButton | `button` | CTA 换成上面修正后的深红 |
| 卡片（HUD、对阵、结论、游戏货架） | `card` | 不嵌套卡片 |
| 徽章（LIVE、你、AI、比 AI 快） | `badge` | |
| 倒计时分段条 | `progress`（分段变体） | |
| 「机会」方块 | 自写 3 格方块 | **不用 8bitcn 的 health-bar/heart 语义**，避免出现「命/life」 |
| 对阵用时条 VsRaceBar | `progress` ×2 | |
| 手机 AI 详情、汉堡菜单 | `sheet` / `drawer` | 替换现在的 DetailsSheet |
| 退出确认 | `alert-dialog` | |
| 排行榜 | `table` + `tabs` | |
| FAQ | `accordion` | |
| 面包屑 | `breadcrumb` | 和 JSON-LD BreadcrumbList 保持一致 |
| 键盘提示 | `kbd` | |
| 分享成功提示 | `toast` | |
| 关卡加载 | `skeleton` / `spinner` | |
| 语言切换 | `toggle-group` | 保持不重定向 |
| **AI 终端面板**（AiActivityPanel + 揭晓时间线） | 自写，借 asciicn 的写法 | `[ok]`、`[..]`、`░▓█` 方块条、小写提示符 `luna@decisions:~$` |
| 弹幕道 AiDanmakuLane | 自写 | 28px 高，等宽小字，灰色加蓝色「AI」前缀，安静 |
| 首页竞赛小窗 | 自写 | 窗口标题栏 + 3×3 小棋盘 + 两个光标 |
| 棋盘框 | 自写 | 4px 框 + 6px 硬阴影；关卡图本身不变 |

## 7. 实施阶段（每个 PR 都本地 E2E 加线上自测后再交付）

**阶段 1：响应式骨架**（可以先用一套极简中性皮肤，Token 名直接按第 5 节定，阶段 2 只换值）
- **PR-1 布局底座**
  - 新增 `SiteShell`、`GameShell`、`ResultShell`、`SiteNav`（含手机菜单）、`SiteFooter`。
  - 删除 `.mobile-shell` 窄列和旧 globals 里的布局规则；建立断点和容器 Token。
- **PR-2 对局 + 揭晓两栏**
  - 棋盘尺寸公式；桌面常驻 AI 终端，手机用抽屉。
  - 对局和揭晓共用 `GameStageLayout`，保证棋盘同尺寸，下一关在棋盘正下方。
  - 键盘 `Esc` / `Enter`。
- **PR-3 首页、结算、排行榜、内容页响应式**
  - 方案 B 拍板后，首页和内容页加首屏以下的内容。
- **E2E 视口矩阵**：1440×900、1280×720、1024×768、820×1180、390×844、375×667。断言：
  1. 游戏页没有纵向和横向滚动。
  2. 对局和揭晓的棋盘 `getBoundingClientRect` 一致。
  3. 下一关按钮的 top 等于棋盘 bottom 加间距。
  4. 文案不出现 `命|条命|life`。

**阶段 2：像素设计系统**
- **PR-4 Token、字体和工具链**
  - 引入 Tailwind v4（8bitcn 和 asciicn 都依赖它；需要你同意，见第 10 节），把 CSS 变量映射到 `@theme`。
  - Fusion Pixel 子集化脚本加 Press Start 2P 自托管（不连 Google Fonts，对 CN 访问友好）。
- **PR-5 8bitcn 组件引入**：用 shadcn CLI 把需要的组件拷进仓库（代码归我们所有），按 Token 改色，替换全站按钮、卡片、徽章、表格、抽屉等。
- **PR-6 游戏专属组件**：AI 终端、弹幕道、HUD、竞赛小窗、棋盘框、揭晓叠层。
- **PR-7 分享海报和 OG 图换皮**（`lib/poster.ts`、预渲染 OG PNG），并做视觉回归截图。
- 可选：把 StyleKit 像素风 SKILL.md 收进 `oceanz0312/skills` 和 skills.zdychanges.workers.dev（按 skills-library-sync 规则双端同步），以后改 UI 时按它自检。

## 8. 风险
1. **关卡图和像素皮肤风格不一致**：关卡图是浅色圆角格子，不是像素画。因为它必须和 AI 输入逐字节一致，这次只加像素外框，不改图。要做像素版关卡，就得出 v2 新关卡目录，统计也会重新开始。
2. **像素字的可读性**：中文像素字只在 12 的整数倍下清晰，小于 12px 不可用；正文必须用无衬线字体。英文 Press Start 2P 很宽，非英语语种的标题要预留换行。
3. **字体体积和布局跳动（CLS）**：必须子集化加 preload，否则中文首屏会闪字。
4. **短屏**：桌面高度 ≤ 700（小笔记本加书签栏）时棋盘会缩到约 480px，仍比现在大；手机 375×667 进入紧凑模式（已验证一屏）。
5. **Tailwind 迁移**：等于重写全部样式（旧 CSS 不保留，正好符合你的要求），但改动面大。拆成上面的 PR 逐步合并，每步都可以独立部署。
6. **常驻 AI 终端可能分散玩家注意力**：内容是真实网络步骤，不透露答案。如果你觉得干扰，可以默认折叠成一行。
7. **SEO**：URL、canonical、hreflang、JSON-LD 不变，所以没有迁移风险。方案 B 会增加正文，对 SEO 是加分。

## 9. 草图清单
| 文件 | 内容 |
|---|---|
| `web-first-sketches/home-desktop-1440x900.png` | 首页桌面首屏 |
| `web-first-sketches/home-desktop-1440-fullpage.png` | 首页桌面整页（演示方案 B 的首屏以下内容） |
| `web-first-sketches/home-mobile-390x844.png` | 首页手机首屏 |
| `web-first-sketches/play-desktop-1440x900.png` | 对局页桌面（9×9 第 7 关） |
| `web-first-sketches/play-mobile-390x844.png` | 对局页手机 |
| `web-first-sketches/reveal-desktop-1440x900.png` | 揭晓页桌面（棋盘同尺寸，下一关紧贴棋盘下方） |
| `web-first-sketches/reveal-mobile-390x844.png` | 揭晓页手机 |
| `web-first-sketches/_check/*.png` | 额外验证：1280×720、1024×768、820×1180、375×667 |

## 10. 需要你拍板的问题
1. **方案 B**：首页和 SEO 内容页「首屏自成一体 + 下面可以滚动」，桌面和手机都这样（游戏页仍严格一屏）。同意吗？
2. **「3 条命」机制的对外说法**：草图暂时用「机会 ■■□」。备选：「容错」、「可错 3 次」、只显示方块不配文字。另外「20 关」要不要露出？草图里 HUD 显示 07/20，首页不写「20 关」。
3. **品牌字样**：现在是「HUMAN / AI」，草图改成了「HUMAN VS AI」，和目标域名 humanvsai.app 一致。确认吗？
4. **工具链**：引入 Tailwind v4 + 8bitcn（推荐，组件现成，后续游戏复用），还是不加 Tailwind、手写 CSS 照着 8bitcn 的样子做（更轻但工作量大）？
5. **关卡图**：v1 原图加像素外框（推荐，不影响 AI 公平和统计），还是另做 v2 像素风关卡？
6. **桌面对局时 AI 终端常驻展开**还是默认折叠？
7. **首页货架上的「更多游戏 · 筹备中」占位**放不放？
8. **只做浅色主题**（推荐 MVP 先这样，Token 已经为暗色预留），还是同时做暗色？
9. **StyleKit 像素风 skill** 要不要收进 skills 仓库和 registry（会按同步规则双端提交）？
