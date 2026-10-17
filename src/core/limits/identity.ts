/**
 * Who is "a person" for the daily limit: a random per-browser player key (crypto.randomUUID, kept in
 * localStorage as `hai_player_key`). No fingerprinting, no IP. The server stores only
 * SHA-256(salt | key). Clearing site storage gives a fresh allowance — intended.
 */
async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** RFC 4122 UUID (what crypto.randomUUID produces). */
export const PLAYER_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isPlayerKey = (value: unknown): value is string => typeof value === "string" && PLAYER_KEY_PATTERN.test(value);

export async function playLimitKey(input: { playerKey: string; salt: string }) {
  return sha256Hex(`pk|${input.salt}|${input.playerKey}`);
}

/** Constant-time-ish comparison for the test bypass header. */
export function bypassMatches(header: string | null, secret: string | undefined) {
  if (!header || !secret || secret.length < 16) return false;
  if (header.length !== secret.length) return false;
  let diff = 0;
  for (let index = 0; index < secret.length; index += 1) diff |= header.charCodeAt(index) ^ secret.charCodeAt(index);
  return diff === 0;
}

export const PLAY_LIMIT_BYPASS_HEADER = "x-play-limit-bypass";
