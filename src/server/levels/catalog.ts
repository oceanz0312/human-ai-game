import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LEVELS_V1, type LevelSpec } from "./spec";

export type PrivateLevel = LevelSpec;
export const PRIVATE_LEVELS_V1: PrivateLevel[] = LEVELS_V1;

export function getPrivateLevel(levelNumber: number): PrivateLevel {
  const found = PRIVATE_LEVELS_V1.find((item) => item.level === levelNumber);
  if (!found) throw new Error(`Unknown v1 level: ${levelNumber}`);
  return found;
}

export function toPublicLevel(level: PrivateLevel) {
  return {
    version: level.version,
    level: level.level,
    gridSize: level.gridSize,
    limitMs: level.limitMs,
    imageUrl: level.imageUrl,
    choices: level.choices,
  };
}

const imageCache = new Map<number, string>();

export async function readLevelImageDataUrl(levelNumber: number): Promise<string> {
  const cached = imageCache.get(levelNumber);
  if (cached) return cached;
  const level = getPrivateLevel(levelNumber);
  const bytes = await readFile(path.join(process.cwd(), "public", level.imageUrl));
  const dataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  imageCache.set(levelNumber, dataUrl);
  return dataUrl;
}
