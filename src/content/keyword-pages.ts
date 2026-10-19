import type { QuickModeKey } from "@/games/spot-the-difference/quick/puzzle";
import { AI_CURVE_LINE } from "./ai-curve";

/**
 * English keyword pages (one search term = one page, SEO plan 2026-10-18). Every page carries its own copy;
 * nothing here is shared between pages except the FAQ item that must appear site-wide on the home page.
 */
export interface KeywordSection {
  h2: string;
  paragraphs?: string[];
  list?: string[];
}
export interface KeywordPageContent {
  path: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  board: { mode: QuickModeKey; seed: string; label: string; /** Start button on the board; themed only when the board really is that theme. */ start?: string };
  sections: KeywordSection[];
  faq: { q: string; a: string }[];
  links: { href: string; label: string }[];
  /** Short name for nav/footer/breadcrumbs. */
  nav: string;
  /**
   * "demo" (home only, plan "Approved v2"): the board opens with a ~3 s skippable demo and has no button on it,
   * there is a single primary CTA (straight into the 20-level run), and theme cards follow the first screen.
   */
  hero?: "demo";
}

/** Theme cards under the home first screen (each links an existing keyword page). */
export const THEME_CARDS = [
  { href: "/easy", label: "Easy spot the difference", blurb: "Small grids, bigger changes, more time." },
  { href: "/hard", label: "Hard spot the difference", blurb: "Up to 8×8 grids, one pixel changed." },
  { href: "/for-kids", label: "Spot the difference for kids", blurb: "Big 3×3 pictures and a long timer." },
  { href: "/christmas", label: "Christmas spot the difference", blurb: "Trees, gifts, bells and snowmen." },
  { href: "/pictures", label: "Spot the difference pictures", blurb: "The pixel picture set behind every puzzle." },
];

/** Shared closing for every keyword-page AI FAQ (20-level curve; keep in sync with sim-v2). */
const AI_FAQ_CORE =
  "It starts slow on the first levels, gets faster as the grids grow, and from level 15 it gets brutal. Beat it by being quicker, or by catching the levels it gets wrong.";

/** Default AI FAQ (home / game / find). Question kept for FAQ schema tests. */
export const AI_FAQ = {
  q: "Can I play spot the difference against AI?",
  a: `Yes. Every puzzle here is a race against Luna AI, our in-game simulated opponent. You both see the same pictures at the same moment and whoever finds the odd one first wins. ${AI_FAQ_CORE}`,
};

/** Easy page: early-level / gentle AI (quick mode aiLevel 3). */
const AI_FAQ_EASY = {
  q: "Can I beat the AI on easy spot the difference?",
  a: `Yes. Easy mode matches the early levels of the full game — small grids and a gentler Luna AI — so you will beat it more often than not. ${AI_FAQ_CORE}`,
};

/** Hard page: late-game strength (quick mode aiLevel 16 ≈ levels 15–20). */
const AI_FAQ_HARD = {
  q: "How strong is the AI on hard spot the difference?",
  a: `On this page Luna AI plays at late-game strength — the same band as levels 15–20 of the full run. ${AI_FAQ_CORE}`,
};

/** For-kids page: gentle AI so parents and kids can practice together (quick mode aiLevel 1). */
const AI_FAQ_KIDS = {
  q: "Can kids play spot the difference against AI?",
  a: `Yes. Kids mode keeps the grids small and Luna AI gentle, so parents and children can practice easy levels together before the full 20-level run. ${AI_FAQ_CORE}`,
};

/** Christmas page: same race, holiday sprites. */
const AI_FAQ_CHRISTMAS = {
  q: "Can I race the AI on Christmas spot the difference?",
  a: `Yes. The Christmas set races Luna AI on holiday sprites — trees, gifts, snowmen and reindeer — with the same rules as every other puzzle here. ${AI_FAQ_CORE}`,
};

/** Pictures page: gallery sprites in a live race. */
const AI_FAQ_PICTURES = {
  q: "Can I play against AI with these spot the difference pictures?",
  a: `Yes. The live puzzle on this page races Luna AI on the same pixel pictures shown in the gallery. ${AI_FAQ_CORE}`,
};

const L = {
  home: { href: "/", label: "Spot the difference" },
  game: { href: "/spot-the-difference-game", label: "Spot the difference game" },
  find: { href: "/find-the-difference", label: "Find the difference" },
  easy: { href: "/easy", label: "Easy spot the difference" },
  hard: { href: "/hard", label: "Hard spot the difference" },
  kids: { href: "/for-kids", label: "Spot the difference for kids" },
  printable: { href: "/printable", label: "Printable spot the difference" },
  pictures: { href: "/pictures", label: "Spot the difference pictures" },
  christmas: { href: "/christmas", label: "Christmas spot the difference" },
  how: { href: "/how-to-play", label: "How to play" },
  vs: { href: "/human-vs-ai", label: "Human vs AI mode" },
};

export const KEYWORD_PAGES: Record<string, KeywordPageContent> = {
  "/": {
    path: "/",
    keyword: "spot the difference",
    nav: "Spot the difference",
    title: "Spot the Difference – Play Free Online | Spot The Difference Game",
    description: "Take on the AI in free spot the difference puzzles: find the one picture that is different before Luna AI does. Play instantly in your browser, no signup.",
    h1: "Spot the Difference",
    lede: "Spot the difference before the AI does. Find the one picture that's different in 20 free levels — no download, right in your browser.",
    board: { mode: "home", seed: "home-v1", label: "Spot the difference puzzle" },
    hero: "demo",
    sections: [
      {
        h2: "How this spot the difference works",
        paragraphs: [
          "Each puzzle is a grid of identical pixel pictures with exactly one copy that is a little different: a pixel recolored, a dot missing, an edge that moved. Spot the difference, tap it, and the round ends.",
          "Luna AI scans the same grid at the same moment. If you find the odd picture first, you take the round. Three quick puzzles make a match; the grids grow from 4×4 to 6×6 as you go.",
        ],
      },
      {
        h2: "Want a longer challenge?",
        paragraphs: [
          "The full spot the difference game has 20 levels, from 3×3 warm-ups to 9×9 grids with a clock that shrinks every level, three chances per run and a daily leaderboard.",
          AI_CURVE_LINE,
        ],
      },
      {
        h2: "Pick your style",
        list: [
          "Easy puzzles with bigger, more obvious changes.",
          "Hard puzzles where a single pixel is different.",
          "Kids puzzles with three-by-three grids and a long timer.",
          "Christmas puzzles with trees, gifts and snowmen.",
          "Printable sheets with an answer key for the classroom or a rainy day.",
        ],
      },
    ],
    faq: [
      { q: "Is spot the difference free?", a: "Yes. Every puzzle on this site is free to play in the browser, with no signup and no download." },
      AI_FAQ,
      { q: "How many differences are there?", a: "Exactly one per puzzle: one picture in the grid is not like the others. In the hard mode only a single pixel changes." },
      { q: "Does it work on phones?", a: "Yes. The board fits one screen on phones, tablets and desktops, and every cell is a large tap target." },
    ],
    links: [L.game, L.find, L.easy, L.hard, L.kids, L.printable, L.christmas, L.pictures],
  },
  "/spot-the-difference-game": {
    path: "/spot-the-difference-game",
    keyword: "spot the difference game",
    nav: "Play the game",
    title: "Spot the Difference Game – 20 Levels vs AI | Spot The Difference Game",
    description: "Take on the AI in a 20-level spot the difference game: 3×3 to 9×9 grids, a shrinking clock, three chances and a daily leaderboard. Free in your browser.",
    h1: "Spot the Difference Game",
    lede: "Warm up on three quick puzzles, then start the 20-level run against the AI.",
    board: { mode: "game", seed: "game-v1", label: "Spot the difference game warm-up", start: "Tap to play a quick round" },
    sections: [
      {
        h2: "The 20-level run",
        paragraphs: [
          "Levels 1 to 5 are 3×3 warm-ups. From level 6 the board jumps to 9×9 – eighty-one nearly identical cells – and the clock keeps getting shorter until the last levels give you under four seconds.",
          "You have three chances. A wrong tap or a timeout costs one; when they are gone the run ends and your score goes on the leaderboard. Beat the AI to a level and it counts as a win in your streak.",
        ],
      },
      {
        h2: "What makes this spot the difference game different",
        list: [
          "An opponent: Luna AI races you on every level and shows its time and confidence after each reveal.",
          "Fair start: you and the AI get the picture at the same instant and share the same clock.",
          "Short sessions: a full run takes about three minutes.",
          "Three runs a day per browser keep the leaderboard honest; the warm-up puzzles above are unlimited.",
        ],
      },
    ],
    faq: [
      { q: "How long is a run?", a: "Twenty levels, usually two to four minutes depending on how fast you are and how many chances you keep." },
      { q: "Is there a leaderboard?", a: "Yes. Finished runs are ranked by levels cleared, then by total time." },
      AI_FAQ,
    ],
    links: [L.home, L.how, L.hard, L.vs, L.find, L.printable],
  },
  "/find-the-difference": {
    path: "/find-the-difference",
    keyword: "find the difference",
    nav: "Find the difference",
    title: "Find the Difference – Free Online Puzzles | Spot The Difference Game",
    description: "Find the difference in grids of pixel pictures and take on the AI while you do it. Three free puzzles per match, from 4×4 to 8×8. No signup.",
    h1: "Find the Difference",
    lede: "One picture in the grid does not match. Find the difference faster than the AI.",
    board: { mode: "find", seed: "find-v1", label: "Find the difference puzzle", start: "Tap to play a quick round" },
    sections: [
      {
        h2: "Find the differences, one grid at a time",
        paragraphs: [
          "Classic find the differences puzzles put two big pictures side by side. Here the idea is packed into a grid: every cell shows the same picture except one. That makes each round fast – five to twenty seconds – and perfect for a phone.",
          "The match jumps from a 4×4 grid to 6×6 and finally 8×8, so your eyes have to switch from quick glances to a careful sweep.",
        ],
      },
      {
        h2: "Tips to find the difference faster",
        list: [
          "Look at color first: a recolored pixel jumps out when you unfocus your eyes slightly.",
          "Sweep row by row on big grids instead of jumping around.",
          "Compare outlines – a missing edge pixel changes the silhouette.",
          "Don't wait for the AI: if you see it, tap it.",
        ],
      },
    ],
    faq: [
      { q: "Is find the difference the same as spot the difference?", a: "They are two names for the same kind of puzzle. This page uses bigger grids; the home page is a gentler start." },
      { q: "How many pictures are different?", a: "One per grid. Find it and the round is over." },
      AI_FAQ,
    ],
    links: [L.home, L.game, L.hard, L.pictures, L.how],
  },
  "/easy": {
    path: "/easy",
    keyword: "easy spot the difference",
    nav: "Easy",
    title: "Easy Spot the Difference – Relaxed Puzzles | Spot The Difference Game",
    description: "Easy spot the difference puzzles with small grids and clear changes. Take on a gentle AI opponent at your own pace – free, no signup.",
    h1: "Easy Spot the Difference",
    lede: "Small grids, bigger changes, plenty of time. A relaxed way to play.",
    board: { mode: "easy", seed: "easy-v1", label: "Easy spot the difference puzzle", start: "Tap to play an easy round" },
    sections: [
      {
        h2: "Why start easy",
        paragraphs: [
          "Easy puzzles change four pixels in the odd picture instead of one or two, and the grids stay at 3×3 and 4×4. You get 25 seconds per puzzle and the AI on this page plays like a beginner.",
          "It is a good warm-up before the main game and a calm option for anyone who simply enjoys spotting differences without pressure.",
        ],
      },
      { h2: "Good for", list: ["A two-minute break.", "Older players who prefer a slower pace.", "Learning the controls before the 20-level run."] },
    ],
    faq: [
      { q: "How is easy mode easier?", a: "Fewer cells, a longer timer and more changed pixels in the odd picture." },
      AI_FAQ_EASY,
      { q: "Can I switch to harder puzzles?", a: "Yes – the hard page uses up to 8×8 grids with a single changed pixel." },
    ],
    links: [L.kids, L.home, L.hard, L.game],
  },
  "/hard": {
    path: "/hard",
    keyword: "hard spot the difference",
    nav: "Hard",
    title: "Hard Spot the Difference – One-Pixel Puzzles | Spot The Difference Game",
    description: "Hard spot the difference: 6×6 to 8×8 grids where a single pixel changes. Take on the strongest AI setting and see who blinks first.",
    h1: "Hard Spot the Difference",
    lede: "Up to 64 pictures and only one pixel is different. For sharp eyes only.",
    board: { mode: "hard", seed: "hard-v1", label: "Hard spot the difference puzzle", start: "Tap to play a hard round" },
    sections: [
      {
        h2: "What makes it hard",
        paragraphs: [
          "Only one pixel of an 8×8 sprite changes – sometimes a color swap, sometimes a pixel added or removed at the edge. The grids run 6×6, 7×7 and 8×8, and the AI here plays at its level-16 strength.",
          "Expect to lose some rounds. Luna AI starts slow on the 6×6 grid and gets faster as the grids grow – from about 2.5 seconds to about 1.6 seconds on the 8×8 – and it gets roughly nine in ten right. Beat it by being quicker, or by catching the round it gets wrong.",
        ],
      },
      { h2: "Strategy for one-pixel differences", list: ["Split the grid into quarters and clear one at a time.", "Focus on the sprite's outline – edge changes are the hardest to see.", "Trust your first strong hunch; the clock is short."] },
    ],
    faq: [
      { q: "Is this harder than the 20-level game?", a: "The 9×9 levels of the main game are tougher on time; these puzzles are tougher on detail." },
      AI_FAQ_HARD,
    ],
    links: [L.game, L.find, L.easy, L.home],
  },
  "/for-kids": {
    path: "/for-kids",
    keyword: "spot the difference for kids",
    nav: "For kids",
    title: "Spot the Difference for Kids – Free & Simple | Spot The Difference Game",
    description: "Spot the difference for kids: big 3×3 grids, cute pixel animals and a 40-second timer. Free, no signup, works on tablets.",
    h1: "Spot the Difference for Kids",
    lede: "Big pictures, small grids, lots of time. Can you beat the robot?",
    board: { mode: "kids", seed: "kids-v1", label: "Spot the difference puzzle for kids", start: "Tap to play a round for kids" },
    sections: [
      {
        h2: "Made for young players",
        paragraphs: [
          "The grids are 3×3 and 4×4, the odd picture has five changed pixels, and every puzzle gives 40 seconds. Cells are large tap targets, so it works well on a tablet held by small hands.",
          "Spot the difference builds attention to detail, visual memory and patience. Racing the friendly AI turns it into a game kids want to replay.",
        ],
      },
      { h2: "For parents and teachers", list: ["No account, no chat, no personal data asked.", "Each match is three puzzles – about two minutes.", "Want paper puzzles? The printable page has sheets with an answer key."] },
    ],
    faq: [
      { q: "What age is this for?", a: "Most children from about four can play the 3×3 puzzles; the 4×4 round is a good stretch." },
      AI_FAQ_KIDS,
      { q: "Is it safe for kids?", a: "There is no signup, chat or user content. The game never asks for personal information." },
    ],
    links: [L.easy, L.printable, L.christmas, L.home],
  },
  "/christmas": {
    path: "/christmas",
    keyword: "christmas spot the difference",
    nav: "Christmas",
    title: "Christmas Spot the Difference – Free Holiday Puzzles | Spot The Difference Game",
    description: "Christmas spot the difference: trees, gifts, snowmen and reindeer – find the odd one out and take on the AI. Free festive puzzles, no signup.",
    h1: "Christmas Spot the Difference",
    lede: "Trees, gifts, bells and snowmen. One of them is not quite right.",
    board: { mode: "christmas", seed: "xmas-v1", label: "Christmas spot the difference puzzle", start: "Tap to play a Christmas round" },
    sections: [
      {
        h2: "A festive set of puzzles",
        paragraphs: [
          "This Christmas set swaps the everyday pictures for eight holiday sprites: a Christmas tree, a gift box, a snowman, a bell, a candy cane, a stocking, an ornament and a reindeer. Each match is three puzzles on 4×4, 5×5 and 6×6 grids.",
          "Look for an ornament that changed color, a missing ribbon pixel or a reindeer with an odd antler. Then race Luna AI to tap it.",
        ],
      },
      { h2: "Holiday ideas", list: ["Play as a family: pass the phone and compare scores.", "Print the Christmas sheet for a classroom party.", "Challenge each other to beat the AI three times in a row."] },
    ],
    faq: [
      { q: "Are there printable Christmas puzzles?", a: "Yes – the printable page includes a Christmas sheet with an answer key." },
      AI_FAQ_CHRISTMAS,
    ],
    links: [L.printable, L.kids, L.home, L.pictures],
  },
  "/pictures": {
    path: "/pictures",
    keyword: "spot the difference pictures",
    nav: "Pictures",
    title: "Spot the Difference Pictures – Pixel Puzzle Gallery | Spot The Difference Game",
    description: "Spot the difference pictures: browse the pixel picture set, see which details change, then take on the AI in a live puzzle. Free, no signup.",
    h1: "Spot the Difference Pictures",
    lede: "Every puzzle is built from these pixel pictures. Study them, then play.",
    board: { mode: "home", seed: "pictures-v1", label: "Spot the difference pictures puzzle", start: "Tap to play a quick round" },
    sections: [
      {
        h2: "About the pictures",
        paragraphs: [
          "All puzzles use 8×8 pixel sprites with a small palette, so a single changed pixel is a real, visible difference rather than compression noise. The gallery below shows each picture next to an example of a changed copy.",
        ],
      },
    ],
    faq: [
      { q: "Can I use these pictures in class?", a: "Yes, for personal and classroom use. The printable page has ready-made sheets with an answer key." },
      AI_FAQ_PICTURES,
    ],
    links: [L.printable, L.christmas, L.home, L.find],
  },
};
