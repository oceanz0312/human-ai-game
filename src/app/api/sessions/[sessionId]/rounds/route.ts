import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";
import { ServerTiming } from "@/server/server-timing";

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const timing = new ServerTiming();
  const routeStart = performance.now();
  return handle(async (service) => {
    const authStart = performance.now();
    const playerId = await readPlayerId();
    timing.mark("auth", authStart, "player-cookie");
    if (!playerId) throw new GameError("not_found");

    const body = await service.startNextRound((await params).sessionId, playerId, timing);
    timing.mark("total", routeStart, "post-sessions-rounds");
    const serverTiming = timing.headerValue();
    return json(body, 201, serverTiming ? { "Server-Timing": serverTiming } : {});
  });
}
