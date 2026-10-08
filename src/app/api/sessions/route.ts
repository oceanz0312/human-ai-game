import { z } from "zod";
import { startSessionSchema } from "@/game/schemas";
import { GameError } from "@/server/errors";
import { allowIp, handle, json, readJson, requirePlayer } from "@/server/http";

const bodySchema = startSessionSchema.extend({ replay: z.boolean().optional() });

export async function POST(request: Request) {
  return handle(async (service) => {
    const parsed = bodySchema.safeParse((await readJson(request)) ?? {});
    if (!parsed.success) throw new GameError("invalid_request");
    if (!allowIp(request, 120, 60 * 60 * 1000)) throw new GameError("too_many_requests");
    const playerId = await requirePlayer(service);
    const session = await service.createSession({ playerId, nickname: parsed.data.nickname, replay: parsed.data.replay });
    return json(session, 201);
  });
}
