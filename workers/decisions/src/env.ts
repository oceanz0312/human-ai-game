/// <reference types="@cloudflare/workers-types" />

export interface WorkerEnv {
  OPENAI_API_KEY: string;
  DECISIONS_WORKER_SHARED_SECRET: string;
  OPENAI_BASE_URL?: string;
  OPENAI_DECISIONS_MODEL?: string;
  OPENAI_DECISIONS_TIMEOUT_MS?: string;
  PUBLIC_BASE_URL?: string;
  DB?: D1Database;
  GAME?: Fetcher;
}
