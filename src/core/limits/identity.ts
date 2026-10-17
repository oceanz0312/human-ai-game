/**
 * Who is "a person" for the daily limit. Only hashes are stored — never the raw fingerprint, IP or UA.
 *
 * key = SHA-256(salt | fp | ipHash) when the browser sent a fingerprint (fp AND ip together, so two
 * identical phones behind different networks don't collide, and one browser can't reset by clearing
 * cookies). Without a fingerprint: SHA-256(salt | ipHash | uaHash).
 */
async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const FP_PATTERN = /^[a-f0-9]{64}$/;

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function playLimitKey(input: { fingerprint?: string | null; ip: string; userAgent: string | null; salt: string }) {
  const ipHash = await sha256Hex(`ip|${input.salt}|${input.ip}`);
  const fp = input.fingerprint && FP_PATTERN.test(input.fingerprint) ? input.fingerprint : null;
  if (fp) return sha256Hex(`fp|${input.salt}|${fp}|${ipHash}`);
  const uaHash = await sha256Hex(`ua|${input.userAgent ?? ""}`);
  return sha256Hex(`ipua|${input.salt}|${ipHash}|${uaHash}`);
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
