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
  human: { status: HumanStatus; choice: string | null; elapsedMs: number } | null;
  ai: { status: AiStatus; correct: boolean | null; elapsedMs: number | null };
  winner: Winner;
  fasterThanAi: boolean | null;
}

export interface RoundStartResponse {
  round: { id: string; level: number };
  level: PublicLevel;
  session: SessionSnapshot;
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
