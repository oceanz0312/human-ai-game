import "server-only";
import { bypassMatches, clientIp, PLAY_LIMIT_BYPASS_HEADER, playLimitKey } from "../core/limits/identity";

/** Resolves the hashed daily-limit key and the test bypass for a request. Nothing raw is stored. */
export async function playLimitContext(request: Request, fingerprint: string | null | undefined) {
  const salt = process.env.PLAY_LIMIT_SALT || process.env.DECISIONS_WORKER_SHARED_SECRET || "local-dev-salt";
  const limitKey = await playLimitKey({ fingerprint, ip: clientIp(request), userAgent: request.headers.get("user-agent"), salt });
  const bypassLimit = bypassMatches(request.headers.get(PLAY_LIMIT_BYPASS_HEADER), process.env.PLAY_LIMIT_BYPASS_SECRET);
  return { limitKey, bypassLimit };
}
