import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handle(async (service) => {
    const playerId = await readPlayerId();
    if (!playerId) throw new GameError("not_found");
    return json(await service.startNextRound((await params).sessionId, playerId), 201);
  });
}
