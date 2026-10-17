import { GameError } from "@/server/errors";
import { handle, json } from "@/server/http";
import { modelsForGame } from "@/models/registry";

/** GET /api/opponents?game=<slug> → registry entries for the game; stats only for live models. */
export async function GET(request: Request) {
  return handle(async (service) => {
    const game = new URL(request.url).searchParams.get("game") ?? "spot-the-difference";
    if (!/^[a-z0-9-]{1,40}$/.test(game)) throw new GameError("invalid_request");
    const opponents = await Promise.all(
      modelsForGame(game).map(async (model) => ({
        id: model.id,
        slug: model.slug,
        publicName: model.publicName,
        provider: model.provider,
        api: model.api,
        status: model.status,
        accent: model.accent,
        // Coming-soon models never get stats (no fake numbers).
        stats: model.status === "live" ? await service.getModelStats(model.id) : null,
      })),
    );
    return json({ game, opponents }, 200, { "Cache-Control": "public, max-age=60" });
  });
}
