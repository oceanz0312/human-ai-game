import type { ModelEntry } from "./types";

/**
 * Model registry: the single source of truth for AI opponents.
 *
 * Only `live` models are ever called. `coming-soon` entries render as greyed cards in the opponent
 * select with no stats, and are never routed, called or written to D1.
 * Adding a live model = one entry here + an adapter in src/models/adapters/ + a config template.
 */
export const models: ModelEntry[] = [
  {
    id: "luna",
    slug: "luna",
    publicName: "Luna",
    provider: "OpenAI",
    api: "Decisions API",
    upstreamModel: "gpt-6-luna",
    status: "live",
    adapter: "openai-decisions",
    capabilities: { vision: true, singleChoice: true, probabilities: true },
    tasks: ["vision-single-choice"],
    games: ["spot-the-difference"],
    accent: "#7cf0ff",
  },
  {
    id: "jev",
    slug: "jev",
    publicName: "JEV",
    provider: "TBA",
    api: "OpenAI-compatible",
    upstreamModel: "jev",
    status: "coming-soon",
    adapter: "openai-compatible-chat",
    capabilities: { vision: true, singleChoice: true, probabilities: false },
    tasks: ["vision-single-choice"],
    games: ["spot-the-difference"],
    accent: "#ffcf4a",
  },
  {
    id: "qwen-cf",
    slug: "qwen-cf",
    publicName: "Qwen·CF",
    provider: "Cloudflare Workers AI",
    api: "Workers AI (fine-tune)",
    upstreamModel: "qwen-vl-finetune",
    status: "coming-soon",
    adapter: "cloudflare-workers-ai",
    capabilities: { vision: true, singleChoice: true, probabilities: false },
    tasks: ["vision-single-choice"],
    games: ["spot-the-difference"],
    accent: "#ff8a3d",
  },
];

export const DEFAULT_MODEL_ID = "luna";

export const getModel = (id: string) => models.find((model) => model.id === id || model.slug === id);
export const liveModels = () => models.filter((model) => model.status === "live");
export const modelsForGame = (game: string) => models.filter((model) => model.games.includes(game));
export const isLiveModel = (id: string | null | undefined) => !!id && getModel(id)?.status === "live";
/** Resolves `?ai=` / a stored choice to a live model id, falling back to the default. */
export const resolveModelId = (requested: string | null | undefined) => {
  const model = requested ? getModel(requested) : undefined;
  return model?.status === "live" ? model.id : DEFAULT_MODEL_ID;
};
