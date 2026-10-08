import { after } from "next/server";
import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";

/** Sent at first paint of the level image: starts the server deadline and the AI in parallel. */
export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  return handle(async (service) => {
    const playerId = await readPlayerId();
    if (!playerId) throw new GameError("not_found");
    const begun = await service.beginRound((await params).roundId, playerId);
    if (begun.started) after(() => service.runAiForRound(begun.roundId));
    return json({ roundId: begun.roundId, deadlineAt: begun.deadlineAt });
  });
}
