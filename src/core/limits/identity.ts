/**
 * Who is "a person" for the daily limit. Only hashes are stored — never the raw fingerprint, IP or UA.
 *
 * key = SHA-256(salt | fp) when the browser sent a fingerprint: the fingerprint is the identity, so
 * clearing cookies or hopping networks (privacy relays, IPv4↔IPv6, mobile↔Wi-Fi) does not reset it.
 * Fallback without a fingerprint (JS off / blocked): SHA-256(salt | netHash | uaHash), where netHash
 * hashes the network prefix (IPv4 /24, IPv6 /48) because relays rotate the exact address per request.
 */
async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const FP_PATTERN = /^[a-f0-9]{64}$/;

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** IPv4 → a.b.c.0/24, IPv6 → first three hextets (/48). */
export function networkPrefix(ip: string) {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(ip) ?? /^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/i.exec(ip);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;
  if (ip.includes(":")) {
    const [head, tail = ""] = ip.toLowerCase().split("::");
    const left = head ? head.split(":") : [];
    const right = tail ? tail.split(":") : [];
    const full = ip.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
    return `${full.slice(0, 3).map((part) => part.replace(/^0+(?=.)/, "")).join(":")}::/48`;
  }
  return ip;
}

export async function playLimitKey(input: { fingerprint?: string | null; ip: string; userAgent: string | null; salt: string }) {
  const fp = input.fingerprint && FP_PATTERN.test(input.fingerprint) ? input.fingerprint : null;
  if (fp) return sha256Hex(`fp|${input.salt}|${fp}`);
  const ipHash = await sha256Hex(`net|${input.salt}|${networkPrefix(input.ip)}`);
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
