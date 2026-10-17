import { isPlayerKey } from "./identity";

/** localStorage key holding this browser's random player key for the daily limit. */
export const PLAYER_KEY_STORAGE = "hai_player_key";

let memoryKey: string | null = null;

function newKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Returns this browser's player key, creating and storing one on first use (storage blocked → per-page key). */
export function getPlayerKey(): string {
  try {
    const stored = window.localStorage.getItem(PLAYER_KEY_STORAGE);
    if (isPlayerKey(stored)) return stored;
    const created = newKey();
    window.localStorage.setItem(PLAYER_KEY_STORAGE, created);
    return created;
  } catch {
    memoryKey ??= newKey();
    return memoryKey;
  }
}
