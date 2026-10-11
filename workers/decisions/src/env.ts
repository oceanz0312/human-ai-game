/// <reference types="@cloudflare/workers-types" />

export interface WorkerEnv {
  /** Deprecated on Decisions Worker — OpenAI key lives on the game service only. */
  OPENAI_API_KEY?: string;
  DECISIONS_WORKER_SHARED_SECRET: string;
  PUBLIC_BASE_URL?: string;
  DB?: D1Database;
  GAME?: Fetcher;
}
