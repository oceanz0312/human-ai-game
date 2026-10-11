import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";
import { ServerTiming } from "@/server/server-timing";

/** Sent at first paint of the level image: starts the server deadline and returns a browser AI dispatch. */
export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const timing = new ServerTiming();
  const routeStart = performance.now();
  return handle(async (service) => {
    const authStart = performance.now();
    const playerId = await readPlayerId();
    timing.mark("auth", authStart, "player-cookie");
    if (!playerId) throw new GameError("not_found");
    const workStart = performance.now();
    const begun = await service.beginRound((await params).roundId, playerId);
    timing.mark("begin", workStart, "mark-shown-and-ticket");
    timing.mark("total", routeStart, "post-round-start");
    const serverTiming = timing.headerValue();
    return json(begun, 200, serverTiming ? { "Server-Timing": serverTiming } : {});
  });
}
