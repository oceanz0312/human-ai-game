import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const PLAYER_COOKIE = "hai_player";
const DEV_SECRET = "development-only-signing-secret-change-me";

function signingSecret() {
  const secret = process.env.RESULT_SIGNING_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" && process.env.DECISIONS_MODE !== "fake") {
    throw new Error("RESULT_SIGNING_SECRET is required in production");
  }
  return DEV_SECRET;
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

/** The anonymous player's recovery credential: `<playerId>.<hmac>`, kept in an httpOnly cookie. */
export function encodePlayerToken(playerId: string) {
  return `${playerId}.${sign(playerId)}`;
}

export function decodePlayerToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const playerId = token.slice(0, dot);
  const expected = Buffer.from(sign(playerId));
  const actual = Buffer.from(token.slice(dot + 1));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return /^[0-9a-f-]{36}$/.test(playerId) ? playerId : null;
}
