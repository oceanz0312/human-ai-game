const en = {
  nav: {
    home: "Home",
    games: "All games",
    spot: "Spot the difference",
    find: "Find the difference",
    humanVsAi: "Human vs AI",
    howToPlay: "How to play",
    faq: "FAQ",
    about: "About",
    levels: "Levels",
    leaderboard: "Leaderboard",
    opponents: "AI opponents",
    privacy: "Privacy",
    terms: "Terms",
    play: "Play now",
    language: "Language",
  },
  /** Per-game card copy, keyed by registry slug. Adding a game = add an entry here (and in zh). */
  gameCopy: {
    "spot-the-difference": {
      name: "Spot the Difference",
      tagline: "Find the one odd cell before the AI does. 3×3 to 9×9 grids, shorter clock every level.",
      cta: "Play",
    },
  } as Record<string, { name: string; tagline: string; cta: string }>,
  /** Tentative names for registry plannedGames (shown only as 筹备中 placeholder cards). */
  plannedCopy: {
      "memory-match": "Memory Match",
      "picture-guess": "Picture Guess"
    } as Record<string, string>,
  /** Platform hub home page. */
  hub: {
      "title": "Human vs AI Games – Can You Beat the AI?",
      "description": "Play free browser games against an AI opponent. Same puzzle, same start. Start with Spot the Difference – no signup.",
      "eyebrowLive": "{n} {n|game|games} live",
      "eyebrowSoon": "More in the works",
      "h1": [
        "Human vs AI",
        "Play games against AI"
      ],
      "lede": "In every game you and an AI opponent get the same puzzle at the same moment. Every reveal shows how it played.",
      "playCta": "Play {game}",
      "allGames": "All games",
      "facts": [
        "AI opponent on every level",
        "No signup · plays in your browser",
        "Free · English"
      ],
      "vsYou": "You",
      "vsYouLabel": "Human player",
      "vsYouSub": "eyes + instinct",
      "vsAiLabel": "AI opponent",
      "vsFoot": "> same puzzle · same start",
      "gamesTitle": "All games",
      "gamesMore": "Game index →",
      "opponent": "Opponent {model}",
      "howAndBoard": "How to play & leaderboard",
      "start": "Start",
      "tentative": "Tentative name",
      "plannedNote": "In the works · opens here when it ships",
      "moreGames": "More games",
      "moreGamesNote": "New games appear here automatically",
      "howTitle": "How it works",
      "steps": [
        [
          "Pick a game",
          "No signup, just open it. Every game has one fixed puzzle set."
        ],
        [
          "Start with the AI",
          "You and an AI opponent get the same puzzle; the clock starts together. The AI plays on the same clock."
        ],
        [
          "Reveal · see how the AI thinks",
          "Each round shows both answers, both times and the AI's confidence, then you get a shareable result."
        ]
      ],
      "faqTitle": "FAQ",
      "faqMore": "All FAQ →",
      "faq": [
        {
          "q": "Is the opponent really an AI?",
          "a": "Luna AI is a simulated in-game opponent, not a live language model, and it never sees your data. It starts slow on the first levels, gets faster as the grids grow, and from level 15 it answers in about half a second and wins most rounds."
        },
        {
          "q": "Do I need to sign up or pay?",
          "a": "No. Every game is free and plays in your browser, on phone or desktop."
        },
        {
          "q": "Does the AI know the answer in advance?",
          "a": "No. The AI only sees the same picture you see; answers are checked on our server after both of you answer."
        },
        {
          "q": "When are new games coming?",
          "a": "New games appear on this page as soon as they ship. Cards marked “in the works” are tentative."
        }
      ],
      "itemListName": "Spot the difference puzzles"
    },
  ui: {
    footerGames: "Games",
    footerLearn: "Learn",
    footerSite: "Site",
    breadcrumb: "Breadcrumb",
    menu: "Menu",
    live: "Live",
    comingSoon: "Coming soon",
    moreGames: "More games",
    inTheWorks: "In the works",
    footerTagline: "Free spot the difference puzzles vs AI.",
    related: "Related",
    exit: "Exit",
  },
  pages: {
    spotTheDifference: {
      title: "Spot the Difference Online – Find the Difference Game vs AI (Free)",
      description: "Free find the difference game: spot the one odd cell in 20 levels and race an AI opponent. No signup, plays in your browser.",
      eyebrow: "Find the difference game",
      h1: "Spot the Difference: You vs AI",
      facts: ["Same picture, same start", "3×3 to 9×9 grids", "Free · no signup"],
      howTitle: "How to play",
      levelsTitle: "Levels",
      intro: "Twenty puzzles, one odd cell in each. You and the AI see the same picture at the same moment — whoever spots the difference first wins the level. Free, no signup, made for phones.",
    },
    findTheDifference: {
      title: "Find the Difference: Quick Puzzles vs AI | Spot The Difference Game",
      description: "Find the difference in seconds. Grids start at 3×3 and jump to 9×9; the clock gets shorter every level. Tips, rules and the hardest levels.",
      eyebrow: "Find the difference",
      h1: "Find the Difference",
      intro: "Grids start at 3×3 and jump to 9×9 by level 6, while the timer shrinks. Scan rows, not cells, and trust your first odd shape. Can you find the difference before the AI does?",
    },
    humanVsAi: {
      title: "Human vs AI Mode: Spot the Difference Against AI | Spot The Difference Game",
      description: "Human vs AI, live: race an AI opponent on the same visual puzzle. See its answer time, confidence and mistakes after every level.",
      eyebrow: "Human vs AI",
      h1: "Human vs AI",
      intro: "Luna AI is a simulated opponent built into this spot the difference game. On levels 1–5 you'll beat it more often than not, levels 6–14 are a close race, and from level 15 it answers in about half a second and wins most rounds. After each level you see its answer time, its confidence and the cells it doubted.",
    },
    games: {
      title: "Human vs AI Games | Spot The Difference Game",
      description: "Browser games where you play against the AI. Start with spot the difference; more human vs AI games are coming.",
      eyebrow: "Games",
      h1: "Human vs AI Games",
      intro: "Each game pits you against the AI on the same puzzle at the same time. One game is live now; more are on the way.",
      comingSoon: "More games coming soon",
    },
    play: {
      title: "Play Spot the Difference | Spot The Difference Game",
      description: "Start a spot the difference run against the AI.",
      eyebrow: "Ready",
      h1: "Race the AI",
      intro: "20 levels. Tap the one cell that's different before the AI does.",
    },
    howToPlay: {
      title: "How to Play Spot the Difference vs AI | Spot The Difference Game",
      description: "How to play: tap the one different cell, beat the clock and the AI. Rules, scoring and tips in 30 seconds.",
      eyebrow: "How to play",
      h1: "How to Play",
      intro: "A run is 20 levels. Each level shows one picture split into cells.",
      steps: [
        "Find the single cell that is different and tap it.",
        "The AI looks at the same picture at the same time.",
        "Be right and faster than the AI to win the level.",
        "Three misses end the run; reach level 20 to clear it.",
      ],
    },
    faq: {
      title: "Spot the Difference vs AI — FAQ | Spot The Difference Game",
      description: "Answers about the human vs AI spot the difference game: is the AI a real model, is it free and how ranking works.",
      eyebrow: "FAQ",
      h1: "FAQ",
      intro: "Short answers to common questions.",
      items: [
        { q: "Is the AI a real language model?", a: "No. Luna AI is a simulated in-game opponent, so no picture ever leaves the game. It starts slow on the first levels, gets faster as the grids grow, and from level 15 it answers in about half a second and wins most rounds. You race the same clock: beat it by being quicker, or by catching the levels it gets wrong." },
        { q: "Can I play spot the difference against AI?", a: "Yes. Every level is a race against Luna AI, our in-game simulated opponent. You both get the same picture at the same moment; tap the odd cell before it does." },
        { q: "Is it free?", a: "Yes, free with no signup. It runs in your phone or desktop browser. Everyone gets 3 runs a day; they come back at 00:00 UTC." },
        { q: "How does ranking work?", a: "By the highest level reached; ties share a rank." },
        { q: "Why did the AI go offline?", a: "If the AI can't answer in time the level still counts for you." },
      ],
    },
    about: {
      title: "About Spot The Difference Game",
      description: "Spot The Difference Game is a free browser puzzle site where you race an AI opponent. Simple, fast, free.",
      eyebrow: "About",
      h1: "About Spot The Difference Game",
      intro: "We build quick browser games that put people and AI opponents on the same puzzle at the same moment. We show the AI's speed and mistakes so you can see where humans still win. Independent project; not affiliated with any AI provider.",
    },
    privacy: {
      title: "Privacy | Spot The Difference Game",
      description: "What Spot The Difference Game stores: an anonymous player id cookie, your runs and an optional nickname.",
      eyebrow: "Legal",
      h1: "Privacy",
      intro: "We store an anonymous player cookie, your runs and an optional nickname to run the game and leaderboard. We don't sell data. The AI opponent is simulated inside the game, so no images or play data are sent to any AI provider. To enforce the 3-runs-a-day limit your browser keeps a random ID in local storage and we store only a one-way hash of it — no fingerprinting, no IP. Clearing site data resets the ID.",
    },
    terms: {
      title: "Terms | Spot The Difference Game",
      description: "Terms of use for Spot The Difference Game games.",
      eyebrow: "Legal",
      h1: "Terms",
      intro: "Play for fun and fair. Automated play, score manipulation or abuse of the service may lead to removal from the leaderboard. The game is provided as is, without warranty.",
    },
    level: {
      eyebrow: "Level {n} of 20 · {tier}",
      crumb: "Level {n}",
      /** Per-difficulty SEO copy (docs/seo/keyword-research.md · long tail: level n / hard / odd one out / timer). */
      tiers: {
        easy: {
          name: "Easy",
          title: "Spot the Difference Level {n} – Easy Odd One Out, {secs}s | Spot The Difference Game",
          description: "Free spot the difference level {n}: find the odd one out among {cells} pictures in {secs} seconds while the AI races you. A quick warm-up before the hard 9×9 levels.",
          h1: "Spot the Difference Level {n}: Find the Odd One Out",
          intro: "Level {n} is a {grid}×{grid} warm-up: {cells} cells, exactly one is different, and you have {secs} seconds. The AI sees the same picture at the same moment, so tap the odd one out first.",
          tip: "Tip: look at the whole grid at once instead of cell by cell. In a 3×3 the odd one out usually jumps out within a second.",
        },
        hard: {
          name: "Hard",
          title: "Hard Spot the Difference Level {n} (9×9, {secs}s Timer) | Spot The Difference Game",
          description: "Hard spot the difference level {n}: find the one different cell among {cells} in {secs} seconds, before the AI does. Free online find-the-difference game, no download.",
          h1: "Hard Spot the Difference: Level {n}",
          intro: "From level 6 the grid jumps to {grid}×{grid}: {cells} nearly identical cells and {secs} seconds to find the difference. It is a spot the difference puzzle with a timer, and the AI is scanning the same image.",
          tip: "Tip: sweep the grid row by row in one pass. Colour and orientation changes are easier to catch than tiny shape changes.",
        },
        expert: {
          name: "Expert",
          title: "Expert Spot the Difference Level {n}: {secs}s to Beat the AI | Spot The Difference Game",
          description: "Expert spot the difference level {n}: {cells} cells and only {secs} seconds. Can you find the difference faster than the AI? A free, hard spot the difference game for adults.",
          h1: "Expert Spot the Difference: Level {n}",
          intro: "Level {n} gives you {secs} seconds for {cells} cells, a little less every level until 3 seconds at level 20. This is where most humans start losing to the AI.",
          tip: "Tip: do not hunt. Relax your eyes on the centre of the grid and tap the first cell that feels off.",
        },
      },
      runs: "Runs played",
      humanWin: "Humans beat the AI",
      aiAvg: "AI average time",
      aiCorrect: "AI accuracy",
      fastest: "Fastest human",
      noData: "Not enough runs yet — play to add data.",
      prev: "Previous level",
      next: "Next level",
      all: "All levels",
    },
    leaderboard: {
      title: "Spot the Difference Leaderboard vs AI | Spot The Difference Game",
      description: "Top players in the human vs AI spot the difference game, ranked by highest level reached.",
      eyebrow: "Leaderboard",
      h1: "Leaderboard",
      intro: "Ranked by highest level reached out of 20; ties share a rank.",
      empty: "No runs yet — be the first.",
      level: "Level {n}",
    },
    aiOpponents: {
      title: "AI Opponents | Spot The Difference Game",
      description: "The AI opponents you play against on Spot The Difference Game.",
      eyebrow: "AI opponents",
      h1: "AI Opponents",
      intro: "Only models that are actually wired into a game are listed here.",
    },
    opponent: {
      title: "Play Against {model} | Spot The Difference Game",
      description: "Race {model} ({provider} {api}) at spot the difference. Answer times and mistakes shown after every level.",
      eyebrow: "AI opponent",
      h1: "Human vs {model}",
      intro: "Your opponent is {model}, an in-game simulated AI. It returns one final answer per level, and we show its timing. Spot The Difference Game is independent and not affiliated with {provider}.",
    },
  },
};
export default en;
export type PagesDictionary = typeof en;
