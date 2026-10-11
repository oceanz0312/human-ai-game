import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LEVEL_IMAGE_SHA256_V1 } from "./image-sha256.generated";
import { LEVELS_V1, type LevelSpec } from "./spec";

export type PrivateLevel = LevelSpec;
export const PRIVATE_LEVELS_V1: PrivateLevel[] = LEVELS_V1;

export function getPrivateLevel(levelNumber: number): PrivateLevel {
  const found = PRIVATE_LEVELS_V1.find((item) => item.level === levelNumber);
  if (!found) throw new Error(`Unknown v1 level: ${levelNumber}`);
  return found;
}

/** SHA-256 of the frozen PNG bytes; used for AI tickets without loading images at request time. */
export function getLevelImageSha256(levelNumber: number): string {
  const hash = LEVEL_IMAGE_SHA256_V1[levelNumber];
  if (!hash) throw new Error(`Missing image SHA256 for v1 level: ${levelNumber}`);
  return hash;
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

const readPublicFile = async (imageUrl: string) => readFile(path.join(process.cwd(), "public", imageUrl));

/** Raw PNG bytes for a frozen v1 level (ASSETS binding on Cloudflare, filesystem locally). */
export async function readLevelImageBytes(
  levelNumber: number,
  loadBytes: (imageUrl: string) => Promise<Uint8Array> = async (imageUrl) => new Uint8Array(await readPublicFile(imageUrl)),
): Promise<Uint8Array> {
  const level = getPrivateLevel(levelNumber);
  return loadBytes(level.imageUrl);
}

/** Cloudflare Worker runtime: read level PNG via the ASSETS binding (never workers.dev). */
export async function readLevelImageBytesFromAssets(assets: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }, levelNumber: number) {
  return readLevelImageBytes(levelNumber, async (imageUrl) => new Uint8Array(await (await assets.fetch(new URL(imageUrl, "https://assets.local"))).arrayBuffer()));
}

/** `loadBytes` reads a public asset path; Cloudflare passes its static-assets binding instead of the file system. */
export async function readLevelImageDataUrl(levelNumber: number, loadBytes: (imageUrl: string) => Promise<Uint8Array> = readPublicFile): Promise<string> {
  const cached = imageCache.get(levelNumber);
  if (cached) return cached;
  const level = getPrivateLevel(levelNumber);
  const bytes = await loadBytes(level.imageUrl);
  const dataUrl = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  imageCache.set(levelNumber, dataUrl);
  return dataUrl;
}
