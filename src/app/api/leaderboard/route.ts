import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";

export async function GET(request: Request) {
  return handle(async (service) => {
    const url = new URL(request.url);
    const version = url.searchParams.get("version") ?? "v1";
    if (version !== "v1") throw new GameError("not_found");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "100") || 100));
    return json(await service.getLeaderboard({ viewerPlayerId: await readPlayerId(), limit }));
  });
}
