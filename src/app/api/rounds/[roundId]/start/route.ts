import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";

/** Sent at first paint of the level image: starts the server deadline and returns a browser AI dispatch. */
export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return handle(async (service) => {
    const playerId = await readPlayerId();
    if (!playerId) throw new GameError("not_found");
    const begun = await service.beginRound((await params).roundId, playerId);
    return json(begun);
  });
}
