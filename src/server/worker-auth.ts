import "server-only";

const encoder = new TextEncoder();

async function digestSecret(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Validates the Decisions Worker → game service Bearer secret without leaking timing hints. */
export async function isWorkerAuthorized(request: Request, secret: string | undefined | null) {
  if (!secret) return false;
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) return false;
  const [expected, actual] = await Promise.all([digestSecret(secret), digestSecret(token)]);
  let diff = secret.length === token.length ? 0 : 1;
  for (let i = 0; i < expected.length; i += 1) diff |= expected[i] ^ actual[i];
  return diff === 0;
}
