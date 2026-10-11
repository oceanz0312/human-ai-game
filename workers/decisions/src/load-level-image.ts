import type { WorkerEnv } from "./env";

function levelImageInternalUrl(level: number) {
  return `https://game.internal/api/internal/levels/${level}/image`;
}

function bytesToDataUrl(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:image/png;base64,${btoa(binary)}`;
}

export class LevelImageLoadError extends Error {
  constructor(
    readonly errorCode: "level_image_unavailable",
    readonly httpStatus: number | null,
    message: string,
  ) {
    super(message);
  }
}

/** Prefer GAME service binding; public URL is dev-only fallback when GAME is absent. */
export async function loadLevelImageBytes(env: WorkerEnv, level: number, fetchImpl: typeof fetch): Promise<Uint8Array> {
  if (env.GAME) {
    const response = await env.GAME.fetch(
      new Request(levelImageInternalUrl(level), {
        headers: { Authorization: `Bearer ${env.DECISIONS_WORKER_SHARED_SECRET}` },
      }),
    );
    if (!response.ok) {
      throw new LevelImageLoadError("level_image_unavailable", response.status, `game_binding_image_${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const base = env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new LevelImageLoadError("level_image_unavailable", null, "game_binding_missing");
  }
  const response = await fetchImpl(`${base}/levels/v1/${String(level).padStart(2, "0")}.png`);
  if (!response.ok) {
    throw new LevelImageLoadError("level_image_unavailable", response.status, `public_image_${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export function levelImageToDataUrl(bytes: Uint8Array) {
  return bytesToDataUrl(bytes);
}
