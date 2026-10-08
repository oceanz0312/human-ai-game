import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handle(async (service) => {
    const playerId = await readPlayerId();
    if (!playerId) throw new GameError("not_found");
    return json(await service.getSession((await params).sessionId, playerId));
  });
}
