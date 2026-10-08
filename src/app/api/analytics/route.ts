import { analyticsEventSchema } from "@/game/schemas";
import { GameError } from "@/server/errors";
import { handle, json, readJson, requirePlayer } from "@/server/http";

export async function POST(request: Request) {
  return handle(async (service) => {
    const parsed = analyticsEventSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new GameError("invalid_request");
    const playerId = await requirePlayer(service);
    await service.recordClientEvent({ ...parsed.data, playerId });
    return json({ ok: true }, 202);
  });
}
