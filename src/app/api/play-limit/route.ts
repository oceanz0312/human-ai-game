import { GameError } from "@/server/errors";
import { handle, json } from "@/server/http";
import { playLimitContext } from "@/server/play-limit";

/** GET /api/play-limit?fp=<sha256> → { limit, used, remaining, resetAt } for today (UTC day). */
export async function GET(request: Request) {
  return handle(async (service) => {
    const fp = new URL(request.url).searchParams.get("fp");
    if (fp !== null && !/^[a-f0-9]{64}$/.test(fp)) throw new GameError("invalid_request");
    return json(await service.getPlayLimit(await playLimitContext(request, fp)));
  });
}
