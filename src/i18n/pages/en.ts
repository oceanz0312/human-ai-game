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
      tagline: "Find the one odd cell before a real AI does. 3×3 to 9×9 grids, shorter clock every level.",
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
      "description": "Play free browser games against a real AI model. Same puzzle, same start, real AI speed. Start with Spot the Difference – no signup.",
      "eyebrowLive": "{n} game live",
      "eyebrowSoon": "More in the works",
      "h1": [
        "Human vs AI",
        "Play games against real AI"
      ],
      "lede": "In every game you and a real AI model get the same puzzle at the same moment. Its speed is its real speed, and every reveal shows how it thought.",
      "playCta": "Play {game}",
      "allGames": "All games",
      "facts": [
        "Real AI answers live",
        "No signup · plays in your browser",
        "English / 中文"
      ],
      "vsYou": "You",
      "vsYouLabel": "Human player",
      "vsYouSub": "eyes + instinct",
      "vsAiLabel": "Real AI model",
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
          "You and a real AI model get the same puzzle; the clock starts together. The AI is never sped up or slowed down."
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
          "a": "Yes. Every puzzle calls a real model live (currently gpt-6-luna). The speed you see is its real speed."
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
      "itemListName": "Human vs AI games"
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
    footerTagline: "Human vs AI games: play against real AI models.",
    related: "Related",
    exit: "Exit",
  },
  pages: {
    spotTheDifference: {
      title: "Spot the Difference Online – Find the Difference Game vs AI (Free)",
      description: "Free find the difference game: spot the one odd cell in 20 levels and race a real AI that answers at real speed. No signup, plays in your browser.",
      eyebrow: "Find the difference game",
      h1: "Spot the Difference: You vs AI",
      facts: ["Same picture, same start", "3×3 to 9×9 grids", "Free · no signup"],
      howTitle: "How to play",
      levelsTitle: "Levels",
      intro: "Twenty puzzles, one odd cell in each. You and a real AI see the same picture at the same moment — whoever spots the difference first wins the level. Free, no signup, made for phones.",
    },
    findTheDifference: {
      title: "Find the Difference: Quick Puzzles vs AI | HUMAN VS AI",
      description: "Find the difference in seconds. Grids start at 3×3 and jump to 9×9; the clock gets shorter every level. Tips, rules and the hardest levels.",
      eyebrow: "Find the difference",
      h1: "Find the Difference",
      intro: "Grids start at 3×3 and jump to 9×9 by level 6, while the timer shrinks. Scan rows, not cells, and trust your first odd shape. Can you find the difference before the AI does?",
    },
    humanVsAi: {
      title: "Human vs AI: Can You Beat a Real AI at a Puzzle?",
      description: "Human vs AI, live: race a real AI model on the same visual puzzle. See its real answer time, confidence and mistakes after every level.",
      eyebrow: "Human vs AI",
      h1: "Human vs AI",
      intro: "No fake bot: every level calls a real AI model and shows its true answer time, confidence and the cells it doubted. Humans still win plenty of levels — the AI is fast, not perfect.",
    },
    games: {
      title: "Human vs AI Games | HUMAN VS AI",
      description: "Browser games where you play against a real AI. Start with spot the difference; more human vs AI games are coming.",
      eyebrow: "Games",
      h1: "Human vs AI Games",
      intro: "Each game pits you against a real AI on the same puzzle at the same time. One game is live now; more are on the way.",
      comingSoon: "More games coming soon",
    },
    play: {
      title: "Play Spot the Difference | HUMAN VS AI",
      description: "Start a spot the difference run against a real AI.",
      eyebrow: "Ready",
      h1: "Race the AI",
      intro: "20 levels. Tap the one cell that's different before the AI does.",
    },
    howToPlay: {
      title: "How to Play Spot the Difference vs AI | HUMAN VS AI",
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
      title: "Spot the Difference vs AI — FAQ | HUMAN VS AI",
      description: "Answers about the human vs AI spot the difference game: is the AI real, is it free, which model it uses and how ranking works.",
      eyebrow: "FAQ",
      h1: "FAQ",
      intro: "Short answers to common questions.",
      items: [
        { q: "Is the AI real?", a: "Yes. Every level sends the picture to a real AI model and shows its real answer time. Nothing is scripted." },
        { q: "Which AI do I play against?", a: "OpenAI's Decisions API with the gpt-6-luna model. We are not affiliated with OpenAI." },
        { q: "Is it free?", a: "Yes, free with no signup. It runs in your phone or desktop browser." },
        { q: "How does ranking work?", a: "By the highest level reached; ties share a rank." },
        { q: "Why did the AI go offline?", a: "If the AI can't answer in time the level still counts for you." },
      ],
    },
    about: {
      title: "About HUMAN VS AI",
      description: "HUMAN VS AI is a small platform of browser games where people race real AI models. Honest timing, no fake bots.",
      eyebrow: "About",
      h1: "About HUMAN VS AI",
      intro: "We build quick browser games that put people and real AI models on the same puzzle at the same moment. We show the AI's true speed and mistakes so you can see where humans still win. Independent project; not affiliated with any AI provider.",
    },
    privacy: {
      title: "Privacy | HUMAN VS AI",
      description: "What HUMAN VS AI stores: an anonymous player id cookie, your runs and an optional nickname.",
      eyebrow: "Legal",
      h1: "Privacy",
      intro: "We store an anonymous player cookie, your runs and an optional nickname to run the game and leaderboard. We don't sell data. Level images are sent to the AI provider to get its answer; no personal data is included.",
    },
    terms: {
      title: "Terms | HUMAN VS AI",
      description: "Terms of use for HUMAN VS AI games.",
      eyebrow: "Legal",
      h1: "Terms",
      intro: "Play for fun and fair. Automated play, score manipulation or abuse of the service may lead to removal from the leaderboard. The game is provided as is, without warranty.",
    },
    level: {
      title: "Spot the Difference Level {n} ({grid}×{grid}, {secs}s) | HUMAN VS AI",
      description: "Spot the difference level {n}: a {grid}×{grid} grid with {secs} seconds. See how fast the AI solves it and how often humans win.",
      eyebrow: "Level {n} of 20",
      h1: "Spot the Difference Level {n}",
      intro: "A {grid}×{grid} grid with {secs} seconds on the clock. Find the one odd cell before the AI does.",
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
      title: "Spot the Difference Leaderboard vs AI | HUMAN VS AI",
      description: "Top players in the human vs AI spot the difference game, ranked by highest level reached.",
      eyebrow: "Leaderboard",
      h1: "Leaderboard",
      intro: "Ranked by highest level reached out of 20; ties share a rank.",
      empty: "No runs yet — be the first.",
      level: "Level {n}",
    },
    aiOpponents: {
      title: "AI Opponents | HUMAN VS AI",
      description: "The real AI models you play against on HUMAN VS AI.",
      eyebrow: "AI opponents",
      h1: "AI Opponents",
      intro: "Only models that are actually wired into a game are listed here.",
    },
    opponent: {
      title: "Play Against {model} | HUMAN VS AI",
      description: "Race {model} ({provider} {api}) at spot the difference. Real answer times, real mistakes.",
      eyebrow: "AI opponent",
      h1: "Human vs {model}",
      intro: "Your opponent is {provider}'s {api} running {model}. It returns one final answer per level, and we show its real timing. HUMAN VS AI is independent and not affiliated with {provider}.",
    },
  },
};
export default en;
export type PagesDictionary = typeof en;
