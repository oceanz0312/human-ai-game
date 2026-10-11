import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";

/** Same-origin fake AI stand-in for local dev and E2E (visible in DevTools as a game API call). */
export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return handle(async (service) => {
    const playerId = await readPlayerId();
    if (!playerId) throw new GameError("not_found");
    const roundId = (await params).roundId;
    await service.getRound(roundId, playerId);
    await service.runAiForRound(roundId);
    return json({ ok: true });
  });
}
