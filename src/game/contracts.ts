export type GridSize = 3 | 9;
export type HumanStatus = "correct" | "incorrect" | "timeout";
export type AiStatus = "pending" | "running" | "complete" | "error";
export type Winner = "human" | "ai" | "none" | "pending";
export type SessionStatus = "active" | "ended";

export const LEVEL_SET_VERSION = "v1";
export const TOTAL_LEVELS = 20;
export const STARTING_LIVES = 3;

export interface PublicLevel {
  version: "v1";
  level: number;
  gridSize: GridSize;
  limitMs: number;
  imageUrl: string;
  choices: string[];
}

export interface SessionSnapshot {
  id: string;
  level: number;
  lives: number;
  fasterThanAiCount: number;
  status: SessionStatus;
  reachedLevel: number;
  cleared: boolean;
  publicId: string | null;
  activeRound: { id: string; level: number; shown: boolean } | null;
}

export interface RoundReveal {
  id: string;
  level: number;
  gridSize: GridSize;
  imageUrl: string;
  correctChoice: string | null;
  human: { status: HumanStatus; choice: string | null; elapsedMs: number } | null;
  /** `refused` marks a real Decisions refusal: the AI answered but could not pick a tile, unlike an offline error. */
  ai: {
    status: AiStatus;
    correct: boolean | null;
    elapsedMs: number | null;
    refused: boolean;
    choice: string | null;
    confidence: number | null;
    probabilities: Record<string, number> | null;
    modelElapsedMs: number | null;
    errorCode: string | null;
    errorDetail: string | null;
  };
  winner: Winner;
  fasterThanAi: boolean | null;
}

export interface RoundStartResponse {
  round: { id: string; level: number };
  level: PublicLevel;
  session: SessionSnapshot;
}

/** Where the browser should trigger AI (visible in DevTools Network). */
export type AiDispatch =
  | { mode: "worker"; url: string; ticket: string; issuedAt: number }
  | { mode: "fake"; url: string };

export interface BeginRoundResponse {
  roundId: string;
  deadlineAt: number | null;
  started: boolean;
  ai: AiDispatch | null;
}

/** Browser-visible Decisions Worker payload (never includes the AI's chosen cell). */
export interface BrowserDecisionResponse {
  status: "complete" | "error";
  requestId: string;
  modelElapsedMs: number;
  imageLoadMs?: number;
  errorCode: string | null;
  receivedAt: number;
}

export interface SubmitResponse {
  round: RoundReveal;
  session: SessionSnapshot;
}

export interface ResultView {
  publicId: string;
  nickname: string | null;
  reachedLevel: number;
  fasterThanAiCount: number;
  /** Settled rounds in this run, and how many the player / the AI answered correctly. */
  played: number;
  humanCorrect: number;
  aiCorrect: number;
  cleared: boolean;
  rank: number;
  bestLevel: number;
  endedAt: number;
}

export interface LeaderboardRow {
  rank: number;
  nickname: string;
  reachedLevel: number;
  isMe?: boolean;
}
