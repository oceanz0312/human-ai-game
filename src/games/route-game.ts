import { notFound } from "next/navigation";
import { getGame, liveGames } from "./registry";

/** Resolves the `[game]` segment of the registry-driven /games/[game]/* templates; unknown or not-live → 404. */
export async function resolveGameParam(params: Promise<{ game: string }>) {
  const game = getGame((await params).game);
  if (!game || game.status !== "live") notFound();
  return game;
}

export const liveGameParams = () => liveGames().map((game) => ({ game: game.slug }));
