import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DecisionClient } from "./decisions/contracts";
import { createCloudflareDecisionClient, createUnconfiguredDecisionClient } from "./decisions/client";
import { FakeDecisionClient } from "./decisions/fake";
import { createDatabase, migrateDatabase } from "./db/client";
import { createGameService, type GameService } from "./game-service";
import { getPrivateLevel, PRIVATE_LEVELS_V1, readLevelImageDataUrl, toPublicLevel } from "./levels/catalog";
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
      latencyMs: fixedLatency ?? 1100 + level.level * 95,
      confidence: missedLevels.has(level.level) ? 0.31 : 0.88,
    };
  });
}

function selectDecisionClient(): DecisionClient {
  const url = process.env.DECISIONS_WORKER_URL;
  const secret = process.env.DECISIONS_WORKER_SHARED_SECRET;
  const mode = process.env.DECISIONS_MODE || (url ? "worker" : process.env.NODE_ENV === "production" ? "off" : "fake");
  if (mode === "worker" && url && secret) return createCloudflareDecisionClient({ url, sharedSecret: secret });
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

const globalForContainer = globalThis as unknown as { __humanAiContainer?: Container };

function build(): Container {
  const db = createDatabase(process.env.DATABASE_URL ?? "file:./local.db", process.env.DATABASE_AUTH_TOKEN);
  const service = createGameService({
    games: createGameRepository(db),
    leaderboard: createLeaderboardRepository(db),
    decisions: selectDecisionClient(),
    now: () => Date.now(),
    randomId: () => randomUUID(),
    randomPublicId: () => randomBytes(16).toString("base64url"),
    getLevel: getPrivateLevel,
    toPublicLevel,
    readLevelImage: readLevelImageDataUrl,
  });
  return { service, ready: migrateDatabase(db) };
}

export async function getGameService(): Promise<GameService> {
  globalForContainer.__humanAiContainer ??= build();
  await globalForContainer.__humanAiContainer.ready;
  return globalForContainer.__humanAiContainer.service;
}
