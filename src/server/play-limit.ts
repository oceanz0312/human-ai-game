import "server-only";
import { bypassMatches, isPlayerKey, PLAY_LIMIT_BYPASS_HEADER, playLimitKey } from "../core/limits/identity";
import { GameError } from "./errors";

/** Resolves the hashed daily-limit key (from the browser's random player key) and the test bypass. */
export async function playLimitContext(request: Request, playerKey: string | null | undefined) {
  if (!isPlayerKey(playerKey)) throw new GameError("invalid_request");
  const salt = process.env.PLAY_LIMIT_SALT || process.env.DECISIONS_WORKER_SHARED_SECRET || "local-dev-salt";
  const limitKey = await playLimitKey({ playerKey, salt });
  const bypassLimit = bypassMatches(request.headers.get(PLAY_LIMIT_BYPASS_HEADER), process.env.PLAY_LIMIT_BYPASS_SECRET);
  return { limitKey, bypassLimit };
}
