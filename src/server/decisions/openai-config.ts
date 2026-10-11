import type { OpenAiConfig } from "./openai";

/** OpenAI Decisions settings from the game service environment (Worker secrets + vars). */
export function readOpenAiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): OpenAiConfig | null {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: env.OPENAI_DECISIONS_MODEL || "gpt-6-luna",
    timeoutMs: Number(env.OPENAI_DECISIONS_TIMEOUT_MS) || 8000,
  };
}
