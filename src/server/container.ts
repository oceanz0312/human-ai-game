import "server-only";
import { waitUntil } from "./runtime";
import { readPlayLimitConfig } from "../core/limits/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DecisionClient } from "./decisions/contracts";
import { createCloudflareDecisionClient, createUnconfiguredDecisionClient } from "./decisions/client";
import { createDirectOpenAiDecisionClient } from "./decisions/direct-openai-client";
import { FakeDecisionClient } from "./decisions/fake";
import type { Database } from "./db/client";
import { createGameService, type GameService } from "./game-service";
import { getLevelImageSha256, PRIVATE_LEVELS_V1, readLevelImageDataUrl } from "./levels/catalog";
import { createSpotTheDifferencePlugin } from "../games/spot-the-difference/server-plugin";
import { createGameRepository, createLeaderboardRepository } from "./repositories/game-repository";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Local-only stand-in when no Worker is configured. It looks the level up by image hash so the
 * Worker contract stays answer-free; it is never selected in production unless DECISIONS_MODE=fake.
 */
function createDevDecisionClient(): DecisionClient {
  let index: Map<string, (typeof PRIVATE_LEVELS_V1)[number]> | null = null;
  const missedLevels = new Set([9, 13, 17, 19, 20]);
  const fixedLatency = process.env.FAKE_AI_LATENCY_MS ? Number(process.env.FAKE_AI_LATENCY_MS) : null;
  const errorLevels = new Set((process.env.FAKE_AI_ERROR_LEVELS ?? "").split(",").filter(Boolean).map(Number));
  return new FakeDecisionClient(async (input) => {
    if (!index) {
      index = new Map();
      for (const level of PRIVATE_LEVELS_V1) index.set(hash(await readLevelImageDataUrl(level.level)), level);
    }
    const level = index.get(hash(input.imageDataUrl));
    if (!level || errorLevels.has(level.level)) return { errorCode: "upstream_error", latencyMs: fixedLatency ?? 600 };
    const wrong = level.choices.find((choice) => choice !== level.correctChoice) ?? null;
    return {
      choice: missedLevels.has(level.level) ? wrong : level.correctChoice,
      latencyMs: fixedLatency ?? 900 + level.level * 40,
      confidence: missedLevels.has(level.level) ? 0.31 : 0.88,
    };
  });
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/** Bindings declared in the root wrangler.jsonc when the game runs on Cloudflare Workers. */
interface CloudflareBindings {
  DB: unknown;
  ASSETS: Fetcher;
  /** Service binding to the Decisions Worker; Workers cannot fetch another workers.dev Worker on the same account. */
  DECISIONS?: Fetcher;
}

async function cloudflareBindings(): Promise<CloudflareBindings | null> {
  // Outside workerd, getCloudflareContext spins up a local wrangler emulator with an empty D1.
  if (globalThis.navigator?.userAgent !== "Cloudflare-Workers") return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as unknown as Partial<CloudflareBindings>;
    return bindings.DB && bindings.ASSETS ? (bindings as CloudflareBindings) : null;
  } catch {
    return null;
  }
}

function resolveDecisionsDispatchMode(): "server" | "off" {
  // The game service always runs the AI itself at first paint (browser ticket dispatch was removed in T4;
  // roll back with a wrangler version rollback). AI_DISPATCH=off keeps the AI offline.
  return process.env.AI_DISPATCH === "off" ? "off" : "server";
}

function selectDecisionClient(decisionsBinding?: Fetcher): DecisionClient {
  const url = process.env.DECISIONS_WORKER_URL;
  const secret = process.env.DECISIONS_WORKER_SHARED_SECRET;
  const mode = process.env.DECISIONS_MODE || (url ? "worker" : process.env.NODE_ENV === "production" ? "off" : "fake");
  // Production keeps the proven egress chain: game → Decisions Worker (us-west-2) → game OpenAI proxy → OpenAI.
  if (mode === "worker" && url && secret && decisionsBinding) {
    const fetchImpl = ((input, init) => decisionsBinding.fetch(input, init)) satisfies typeof fetch;
    return createCloudflareDecisionClient({ url, sharedSecret: secret, fetchImpl });
  }
  if (process.env.OPENAI_API_KEY) return createDirectOpenAiDecisionClient();
  if (mode === "worker" && url && secret) {
    const fetchImpl = decisionsBinding ? ((input, init) => decisionsBinding.fetch(input, init)) satisfies typeof fetch : undefined;
    return createCloudflareDecisionClient({ url, sharedSecret: secret, fetchImpl });
  }
  if (mode === "fake") {
    console.warn("[decisions] using the local fake AI; configure DECISIONS_WORKER_URL for real Decisions answers");
    return createDevDecisionClient();
  }
  return createUnconfiguredDecisionClient();
}

interface Container {
  service: GameService;
  ready: Promise<void>;
}

const globalForContainer = globalThis as unknown as { __humanAiContainer?: Promise<Container> };

async function build(): Promise<Container> {
  const cf = await cloudflareBindings();
  let db: Database;
  let ready = Promise.resolve();
  let readLevelImage = (level: number) => readLevelImageDataUrl(level);
  if (cf) {
    // D1 schema is applied with `wrangler d1 migrations apply`, never at request time.
    const { createD1Database } = await import("./db/d1");
    db = createD1Database(cf.DB);
    readLevelImage = (level) =>
      readLevelImageDataUrl(level, async (imageUrl) => new Uint8Array(await (await cf.ASSETS.fetch(new URL(imageUrl, "https://assets.local"))).arrayBuffer()));
  } else {
    const { createDatabase, migrateDatabase } = await import("./db/client");
    db = createDatabase(process.env.DATABASE_URL ?? "file:./local.db", process.env.DATABASE_AUTH_TOKEN);
    ready = migrateDatabase(db);
  }
  const imageCache = new Map<number, Promise<string>>();
  const readImageUncached = readLevelImage;
  readLevelImage = (level) => {
    const cached = imageCache.get(level) ?? readImageUncached(level);
    imageCache.set(level, cached);
    cached.catch(() => imageCache.delete(level));
    return cached;
  };
  const dispatchMode = resolveDecisionsDispatchMode();
  const service = createGameService({
    games: createGameRepository(db),
    leaderboard: createLeaderboardRepository(db),
    decisions: selectDecisionClient(cf?.DECISIONS),
    now: () => Date.now(),
    randomId: () => randomUUID(),
    randomPublicId: () => randomBytes(16).toString("base64url"),
    game: createSpotTheDifferencePlugin({ loadImageDataUrl: (level) => readLevelImage(level.level) }),
    legacyLevelAssetSha256: getLevelImageSha256,
    decisionsWorkerPublicUrl: process.env.DECISIONS_WORKER_URL ?? null,
    decisionsTicketSecret: process.env.DECISIONS_WORKER_SHARED_SECRET ?? null,
    decisionsDispatchMode: dispatchMode,
    defer: (work) => void waitUntil(work),
    playLimit: readPlayLimitConfig(),
  });
  return { service, ready };
}

export async function getGameService(): Promise<GameService> {
  globalForContainer.__humanAiContainer ??= build();
  const container = await globalForContainer.__humanAiContainer;
  await container.ready;
  return container.service;
}
