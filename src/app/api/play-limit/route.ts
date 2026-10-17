import { handle, json } from "@/server/http";
import { playLimitContext } from "@/server/play-limit";

/** GET /api/play-limit?pk=<player key uuid> → { limit, used, remaining, resetAt } for today (UTC day). */
export async function GET(request: Request) {
  return handle(async (service) => {
    const pk = new URL(request.url).searchParams.get("pk");
    return json(await service.getPlayLimit(await playLimitContext(request, pk)));
  });
}
