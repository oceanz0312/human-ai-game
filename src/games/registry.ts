/**
 * Game registry: the single source of truth for every game on the platform.
 * Adding a game = one entry here + its dictionary copy + src/games/<slug>/ components.
 * Routes, /games index, nav, sitemap, breadcrumbs and hreflang all iterate this list.
 */
export interface GameEntry {
  slug: string;
  /** Keyword landing page (root-level when the game has a strong head keyword). */
  landingPath: string;
  /** Structured section for this game. */
  basePath: string;
  status: "live" | "coming-soon";
  levels: number;
  /** Slugs from aiOpponents that this game really plays against. */
  opponents: string[];
  jsonLdGenre: string;
  /** Static preview image under /public. */
  image: string;
}

export const games: GameEntry[] = [
  {
    slug: "spot-the-difference",
    landingPath: "/spot-the-difference",
    basePath: "/games/spot-the-difference",
    status: "live",
    levels: 20,
    opponents: ["luna"],
    jsonLdGenre: "Puzzle",
    image: "/levels/v1/01.png",
  },
];

/** AI opponents that are actually integrated. Neutral slugs only — no third-party brand names in URLs. */
export interface AiOpponent {
  slug: string;
  /** Honest model identity shown in page copy. */
  model: string;
  provider: string;
  api: string;
}

export const aiOpponents: AiOpponent[] = [{ slug: "luna", model: "gpt-6-luna", provider: "OpenAI", api: "Decisions API" }];

export const liveGames = () => games.filter((game) => game.status === "live");
export const getGame = (slug: string) => games.find((game) => game.slug === slug);
export const getOpponent = (slug: string) => aiOpponents.find((opponent) => opponent.slug === slug);
export const gamePlayPath = (game: GameEntry) => `${game.basePath}/play`;
export const gameLevelPath = (game: GameEntry, level: number) => `${game.basePath}/levels/${level}`;
export const gameLeaderboardPath = (game: GameEntry) => `${game.basePath}/leaderboard`;
