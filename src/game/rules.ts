import type { AiStatus, HumanStatus, Winner } from "./contracts";
import { TOTAL_LEVELS } from "./contracts";

/** Allowance for the round-trip between the image being painted and the server seeing the start/submit calls. */
export const NETWORK_TOLERANCE_MS = 1500;

/**
 * The client reports its own elapsed time, but the server also observes the window between
 * the start call (sent at first paint) and the submit call. The reported value is clamped into
 * that window so a client can neither stall past the deadline nor claim an impossibly fast answer.
 */
export function reconcileElapsed(input: { clientElapsedMs: number; serverElapsedMs: number }) {
  const server = Math.max(0, Math.round(input.serverElapsedMs));
  const client = Math.max(0, Math.round(input.clientElapsedMs));
  const lower = Math.max(0, server - NETWORK_TOLERANCE_MS);
  return Math.min(Math.max(client, lower), server);
}

export function resolveHumanAnswer(input: {
  choice: string | null;
  correctChoice: string;
  elapsedMs: number;
  limitMs: number;
}): { status: HumanStatus; correct: boolean; elapsedMs: number } {
  const elapsedMs = Math.max(0, Math.round(input.elapsedMs));
  if (input.choice === null || elapsedMs > input.limitMs) {
    return { status: "timeout", correct: false, elapsedMs: Math.min(elapsedMs, input.limitMs) };
  }
  const correct = input.choice === input.correctChoice;
  return { status: correct ? "correct" : "incorrect", correct, elapsedMs };
}

export function resolveRace(input: {
  humanCorrect: boolean;
  humanElapsedMs: number;
  aiStatus: AiStatus;
  aiCorrect: boolean | null;
  aiElapsedMs: number | null;
}): { winner: Winner; fasterThanAi: boolean } {
  if (input.aiStatus === "pending" || input.aiStatus === "running") return { winner: "pending", fasterThanAi: false };
  if (input.aiStatus === "error") return { winner: input.humanCorrect ? "human" : "none", fasterThanAi: false };
  if (input.humanCorrect && !input.aiCorrect) return { winner: "human", fasterThanAi: false };
  if (!input.humanCorrect && input.aiCorrect) return { winner: "ai", fasterThanAi: false };
  if (!input.humanCorrect && !input.aiCorrect) return { winner: "none", fasterThanAi: false };
  const fasterThanAi = input.humanElapsedMs < (input.aiElapsedMs ?? Number.POSITIVE_INFINITY);
  return { winner: fasterThanAi ? "human" : "ai", fasterThanAi };
}

export function advanceSession(input: { level: number; lives: number; humanStatus: HumanStatus }) {
  const lives = Math.max(0, input.humanStatus === "correct" ? input.lives : input.lives - 1);
  const ended = lives === 0 || input.level >= TOTAL_LEVELS;
  const cleared = input.level >= TOTAL_LEVELS && lives > 0;
  return { nextLevel: ended ? null : input.level + 1, lives, ended, cleared };
}

export function gridPositions(size: number) {
  return Array.from({ length: size * size }, (_, index) => `r${Math.floor(index / size) + 1}c${(index % size) + 1}`);
}
