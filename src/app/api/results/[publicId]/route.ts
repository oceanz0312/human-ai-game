import { GameError } from "@/server/errors";
import { handle, json } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  return handle(async (service) => {
    const { publicId } = await params;
    if (!/^[A-Za-z0-9_-]{22}$/.test(publicId)) throw new GameError("not_found");
    const result = await service.getResult(publicId);
    if (!result) throw new GameError("not_found");
    return json(result);
  });
}
