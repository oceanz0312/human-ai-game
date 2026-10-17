import type { PagesDictionary } from "./en";

const zh: PagesDictionary = {
  nav: {
    home: "首页",
    games: "全部游戏",
    spot: "大家来找茬",
    find: "找不同",
    humanVsAi: "人类 vs AI",
    howToPlay: "玩法",
    faq: "常见问题",
    about: "关于",
    levels: "关卡",
    leaderboard: "排行榜",
    opponents: "AI 对手",
    privacy: "隐私",
    terms: "协议",
    play: "开始玩",
    language: "语言",
  },
  /** 每个游戏卡片的文案，按 registry slug 索引。新增游戏 = 在这里（和 en）加一条。 */
  gameCopy: {
    "spot-the-difference": {
      name: "大家来找茬",
      tagline: "抢在真实 AI 之前找出唯一不同的格子。从 3×3 到 9×9，时间越来越短。",
      cta: "开始玩",
    },
  },
  /** Tentative names for registry plannedGames (shown only as 筹备中 placeholder cards). */
  plannedCopy: {
      "memory-match": "记忆翻牌",
      "picture-guess": "看图猜词"
    },
  /** Platform hub home page. */
  hub: {
      "title": "人类 vs AI 小游戏：和真实 AI 对战 | HUMAN VS AI",
      "description": "免费在线和真实 AI 对战的小游戏：同一道题、同一秒开始，AI 用的是真实速度。先玩大家来找茬，无需注册。",
      "eyebrowLive": "{n} 款游戏在线",
      "eyebrowSoon": "更多筹备中",
      "h1": [
        "人类 VS AI",
        "和真实 AI 同场对战"
      ],
      "lede": "每一款游戏里，你和真实 AI 模型拿到同一道题、同一秒开始。它的速度就是真实速度，揭晓时还能看到它是怎么想的。",
      "playCta": "玩{game}",
      "allGames": "全部游戏",
      "facts": [
        "真实 AI 实时作答",
        "免注册 · 浏览器即玩",
        "中文 / English"
      ],
      "vsYou": "你",
      "vsYouLabel": "人类玩家",
      "vsYouSub": "眼睛 + 直觉",
      "vsAiLabel": "真实 AI 模型",
      "vsFoot": "> 同一道题 · 同一秒开始",
      "gamesTitle": "全部游戏",
      "gamesMore": "查看游戏目录 →",
      "opponent": "对手 {model}",
      "howAndBoard": "玩法与排行",
      "start": "开始挑战",
      "tentative": "暂定名",
      "plannedNote": "筹备中 · 上线后在这里开放",
      "moreGames": "更多游戏",
      "moreGamesNote": "新游戏会自动出现在这里",
      "howTitle": "怎么玩",
      "steps": [
        [
          "选一款游戏",
          "不用注册，打开即玩。每款游戏都有固定的一套题。"
        ],
        [
          "和 AI 同时开始",
          "你和真实 AI 模型拿到同一道题，计时同时启动，AI 不加速也不放慢。"
        ],
        [
          "揭晓 · 看 AI 怎么想",
          "每关揭晓双方答案、用时与 AI 的把握度，最后生成战绩。"
        ]
      ],
      "faqTitle": "常见问题",
      "faqMore": "全部 FAQ →",
      "faq": [
        {
          "q": "对手真的是 AI 吗？",
          "a": "是。每一题都实时调用真实模型（当前为 gpt-6-luna），你看到的速度就是它的真实速度。"
        },
        {
          "q": "需要注册或付费吗？",
          "a": "不需要。所有游戏免费，手机和电脑浏览器都能玩。"
        },
        {
          "q": "AI 会提前知道答案吗？",
          "a": "不会。AI 只看到和你一样的图，答案在双方作答后由服务器判定。"
        },
        {
          "q": "什么时候有新游戏？",
          "a": "新游戏上线后会自动出现在这个页面。标着「筹备中」的卡片名字都是暂定的。"
        }
      ],
      "itemListName": "人类 vs AI 小游戏"
    },
  ui: {
    footerGames: "游戏",
    footerLearn: "了解",
    footerSite: "站点",
    breadcrumb: "面包屑",
    menu: "菜单",
    live: "已上线",
    comingSoon: "即将推出",
    moreGames: "更多游戏",
    inTheWorks: "筹备中",
    footerTagline: "人类 vs AI 游戏平台：和真实 AI 模型一较高下。",
    related: "相关页面",
    exit: "退出",
  },
  pages: {
    spotTheDifference: {
      title: "大家来找茬在线玩：找不同小游戏，和真实 AI 比快 | HUMAN VS AI",
      description: "免费在线找不同游戏：20 关，每关找出唯一不同的格子，和真实 AI 同场比快。无需注册，打开即玩。",
      eyebrow: "找不同小游戏",
      h1: "大家来找茬：你比 AI 更快吗？",
      facts: ["同一张图 · 同一秒开始", "3×3 到 9×9", "免费 · 免注册"],
      howTitle: "怎么玩",
      levelsTitle: "关卡",
      intro: "20 道题，每道只有一个格子不一样。你和真实 AI 同时看到同一张图，谁先找到谁赢下这一关。免费、无需注册，手机即玩。",
    },
    findTheDifference: {
      title: "找不同：限时小游戏挑战 AI | HUMAN VS AI",
      description: "几秒内找不同：从 3×3 到 9×9，时间越来越短。规则、技巧和最难的关卡。",
      eyebrow: "找不同",
      h1: "找不同",
      intro: "第 1 关是 3×3，第 6 关起变成 9×9，计时也越来越短。按行扫，不要逐格看，相信第一眼的异样。你能比 AI 先找到吗？",
    },
    humanVsAi: {
      title: "人类 vs AI：你能在找茬上赢过真实 AI 吗？",
      description: "人类 vs AI 实时对战：和真实 AI 模型同题比快，每关都能看到它的真实耗时、置信度和失误。",
      eyebrow: "人类 vs AI",
      h1: "人类 vs AI",
      intro: "不是假机器人：每一关都调用真实 AI 模型，展示它的真实耗时、置信度和犹豫过的格子。人类依然能赢下不少关——AI 很快，但不完美。",
    },
    games: {
      title: "人类 vs AI 游戏 | HUMAN VS AI",
      description: "和真实 AI 对战的网页小游戏。先上线大家来找茬，更多游戏陆续推出。",
      eyebrow: "游戏",
      h1: "人类 vs AI 游戏",
      intro: "每个游戏都让你和真实 AI 同时解同一道题。目前上线一个，更多在路上。",
      comingSoon: "更多游戏即将上线",
    },
    play: {
      title: "开始大家来找茬 | HUMAN VS AI",
      description: "开始一局和真实 AI 的找茬对战。",
      eyebrow: "准备",
      h1: "和 AI 比快",
      intro: "20 关。抢在 AI 之前点中那个不一样的格子。",
    },
    howToPlay: {
      title: "玩法：和 AI 比赛找茬 | HUMAN VS AI",
      description: "玩法说明：点中唯一不同的格子，赢过时间和 AI。30 秒看懂规则和技巧。",
      eyebrow: "玩法",
      h1: "怎么玩",
      intro: "一局 20 关，每关是一张被分成格子的图。",
      steps: ["找出唯一不同的格子并点击。", "AI 同时在看同一张图。", "答对且比 AI 快，就赢下这一关。", "失误三次结束本局；到达第 20 关即通关。"],
    },
    faq: {
      title: "大家来找茬 vs AI 常见问题 | HUMAN VS AI",
      description: "关于人类 vs AI 找茬游戏的常见问题：AI 是真的吗、免费吗、用的什么模型、排行怎么算。",
      eyebrow: "常见问题",
      h1: "常见问题",
      intro: "常见问题的简短回答。",
      items: [
        { q: "AI 是真的吗？", a: "是。每一关都会把图发给真实 AI 模型，并展示它的真实耗时，没有任何剧本。" },
        { q: "对手是哪个 AI？", a: "Luna：OpenAI 的 Decisions API（gpt-6-luna）。更多对手即将上线。本站与 OpenAI 没有隶属关系。" },
        { q: "免费吗？", a: "免费，无需注册，手机和电脑浏览器都能玩。每人每天可以玩 3 局，次日（UTC 0 点）恢复。" },
        { q: "排行怎么算？", a: "按最高到达关卡排名，同关并列。" },
        { q: "AI 掉线怎么办？", a: "AI 没能及时作答时，这一关照常为你结算。" },
      ],
    },
    about: {
      title: "关于 HUMAN VS AI",
      description: "HUMAN VS AI 是让人和真实 AI 模型比赛的网页小游戏平台。真实计时，没有假机器人。",
      eyebrow: "关于",
      h1: "关于 HUMAN VS AI",
      intro: "我们做让人和真实 AI 模型在同一时刻解同一道题的网页小游戏，并展示 AI 的真实速度和失误，看看人类还能在哪里赢。独立项目，与任何 AI 厂商无隶属关系。",
    },
    privacy: {
      title: "隐私 | HUMAN VS AI",
      description: "HUMAN VS AI 存储的内容：匿名玩家 Cookie、对局记录和可选昵称。",
      eyebrow: "法务",
      h1: "隐私",
      intro: "为了运行游戏和排行榜，我们存储匿名玩家 Cookie、你的对局记录和可选昵称，不出售任何数据。关卡图片会发送给 AI 服务商以获取答案，不包含个人信息。为了执行每天 3 局的上限，我们只保存由浏览器特征和 IP 计算出的不可逆哈希，不保存原始指纹或 IP。",
    },
    terms: {
      title: "使用协议 | HUMAN VS AI",
      description: "HUMAN VS AI 使用协议。",
      eyebrow: "法务",
      h1: "使用协议",
      intro: "公平地玩、开心地玩。脚本代打、篡改成绩或滥用服务可能会被移出排行榜。游戏按现状提供，不作任何保证。",
    },
    level: {
      eyebrow: "第 {n} 关 / 共 20 关 · {tier}",
      crumb: "第 {n} 关",
      tiers: {
        easy: {
          name: "入门",
          title: "大家来找茬第 {n} 关：{grid}×{grid} 找不同入门（{secs} 秒）| HUMAN VS AI",
          description: "大家来找茬第 {n} 关在线玩：{cells} 个格子里找出唯一不同的那个，限时 {secs} 秒，和真实 AI 同时开找。免费，不用下载。",
          h1: "大家来找茬第 {n} 关：找出不一样的那个",
          intro: "第 {n} 关是 {grid}×{grid} 热身关：{cells} 个格子里只有 1 个不同，限时 {secs} 秒。真实 AI 和你同一秒看到同一张图，看谁先点中。",
          tip: "小技巧：别一格一格看，整体扫一眼。3×3 的找茬，不同的那格通常一秒内就会跳出来。",
        },
        hard: {
          name: "高难度",
          title: "大家来找茬第 {n} 关：9×9 高难度找不同（{secs} 秒）| HUMAN VS AI",
          description: "高难度找不同第 {n} 关：{cells} 个几乎一样的格子，{secs} 秒内找出不同，抢在 AI 前面。考眼力的在线找茬小游戏，免费不用下载。",
          h1: "大家来找茬第 {n} 关：9×9 高难度找不同",
          intro: "从第 6 关开始变成 {grid}×{grid}：{cells} 个格子几乎一模一样，限时 {secs} 秒。这是带倒计时的找不同，对面还有一个真实 AI 在同一张图上找。",
          tip: "小技巧：按行一次扫完。颜色和朝向的变化，比细小的形状变化更容易发现。",
        },
        expert: {
          name: "极限",
          title: "大家来找茬第 {n} 关：极限找不同，仅 {secs} 秒 | HUMAN VS AI",
          description: "极限找茬第 {n} 关：{cells} 格只给 {secs} 秒，你的眼力能赢过真实 AI 吗？免费在线考眼力找不同，不用下载。",
          h1: "大家来找茬第 {n} 关：极限 {secs} 秒找不同",
          intro: "第 {n} 关 {cells} 个格子只给 {secs} 秒，每关再少一点，到第 20 关只剩 3 秒。到这里，多数人开始输给 AI。",
          tip: "小技巧：别刻意去找。把视线放在棋盘中央，点第一个让你觉得别扭的格子。",
        },
      },
      runs: "对局数",
      humanWin: "人类赢过 AI",
      aiAvg: "AI 平均用时",
      aiCorrect: "AI 正确率",
      fastest: "人类最快",
      noData: "对局还不够多，来玩一局补充数据。",
      prev: "上一关",
      next: "下一关",
      all: "全部关卡",
    },
    leaderboard: {
      title: "大家来找茬排行榜 | HUMAN VS AI",
      description: "人类 vs AI 找茬游戏排行榜，按最高到达关卡排名。",
      eyebrow: "排行榜",
      h1: "排行榜",
      intro: "按 20 关中的最高到达关卡排名，同关并列。",
      empty: "还没有对局，来当第一个。",
      level: "第 {n} 关",
    },
    aiOpponents: {
      title: "AI 对手 | HUMAN VS AI",
      description: "在 HUMAN VS AI 上与你对战的真实 AI 模型。",
      eyebrow: "AI 对手",
      h1: "AI 对手",
      intro: "这里只列出真正接入了游戏的模型。",
    },
    opponent: {
      title: "和 {model} 对战 | HUMAN VS AI",
      description: "在大家来找茬里和 {model}（{provider} {api}）比快。真实耗时，真实失误。",
      eyebrow: "AI 对手",
      h1: "人类 vs {model}",
      intro: "你的对手是 {provider} 的 {api}，模型为 {model}。它每关只返回一个最终答案，我们展示它的真实耗时。HUMAN VS AI 是独立项目，与 {provider} 没有隶属关系。",
    },
  },
};
export default zh;
