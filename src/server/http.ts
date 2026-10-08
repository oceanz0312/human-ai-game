import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GameError } from "./errors";
import { decodePlayerToken, encodePlayerToken, PLAYER_COOKIE } from "./identity";
import { getGameService } from "./container";
import type { GameService } from "./game-service";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function errorResponse(error: unknown) {
  if (error instanceof GameError) return json({ error: error.code }, error.status);
  console.error("[api] unexpected error", error instanceof Error ? error.message : error);
  return json({ error: "internal_error" }, 500);
}

export async function readPlayerId() {
  return decodePlayerToken((await cookies()).get(PLAYER_COOKIE)?.value);
}

/** Resolves the anonymous player from the signed cookie, creating one when absent. */
export async function requirePlayer(service: GameService) {
  const existing = await readPlayerId();
  const player = await service.ensurePlayer(existing);
  if (player.id !== existing) {
    (await cookies()).set(PLAYER_COOKIE, encodePlayerToken(player.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.startsWith("https://") : process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return player.id;
}

export async function handle(work: (service: GameService) => Promise<Response>) {
  try {
    return await work(await getGameService());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined);
}

const ipBuckets = new Map<string, { count: number; resetAt: number }>();

/** Coarse per-IP limiter for session creation, which bounds paid Decisions calls. */
export function allowIp(request: Request, limit: number, windowMs: number) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
