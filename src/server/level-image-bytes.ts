import "server-only";
import { readLevelImageBytes, readLevelImageBytesFromAssets } from "./levels/catalog";

/** Loads a v1 level PNG for internal Worker routes (game service only). */
export async function getLevelImagePngBytes(level: number): Promise<Uint8Array | null> {
  if (!Number.isInteger(level) || level < 1 || level > 20) return null;
  try {
    if (globalThis.navigator?.userAgent === "Cloudflare-Workers") {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = await getCloudflareContext({ async: true });
      const assets = (env as { ASSETS?: { fetch: typeof fetch } }).ASSETS;
      if (!assets) return null;
      return readLevelImageBytesFromAssets(assets, level);
    }
    return readLevelImageBytes(level);
  } catch {
    return null;
  }
}
