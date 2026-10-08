import { nicknameSchema } from "@/game/schemas";
import { GameError } from "@/server/errors";
import { handle, json, readJson, requirePlayer } from "@/server/http";

export async function POST(request: Request) {
  return handle(async (service) => {
    const parsed = nicknameSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new GameError("invalid_request");
    const playerId = await requirePlayer(service);
    await service.setNickname(playerId, parsed.data.nickname);
    return json({ nickname: parsed.data.nickname });
  });
}
