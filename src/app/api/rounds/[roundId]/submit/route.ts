import { submitRoundSchema } from "@/game/schemas";
import { GameError } from "@/server/errors";
import { handle, json, readJson, readPlayerId } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return handle(async (service) => {
    const playerId = await readPlayerId();
    if (!playerId) throw new GameError("not_found");
    const parsed = submitRoundSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new GameError("invalid_request");
    return json(await service.submitRound((await params).roundId, playerId, parsed.data));
  });
}
