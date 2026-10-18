import * as z from "zod/mini";
import { decisionRequestSchema } from "./contracts";

/** Short-lived, single-use ticket authorizing one browser → Decisions Worker call for a round. */
export const decisionTicketPayloadSchema = z.object({
  v: z.literal(1),
  jti: z.uuid(),
  roundId: z.string().check(z.minLength(8)),
  sessionId: z.string().check(z.minLength(8)),
  level: z.int().check(z.minimum(1), z.maximum(20)),
  imageSha256: z.string().check(z.regex(/^[a-f0-9]{64}$/)),
  choices: decisionRequestSchema.shape.choices,
  exp: z.int().check(z.positive()),
  iat: z.int().check(z.positive()),
});

export type DecisionTicketPayload = z.infer<typeof decisionTicketPayloadSchema>;

export type TicketVerifyError = "ticket_invalid" | "ticket_expired" | "ticket_tampered";

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

async function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256HexFromDataUrl(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("invalid_data_url");
  const base64 = dataUrl.slice(comma + 1);
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return sha256Hex(new Uint8Array(bytes));
}

export async function signDecisionTicket(payload: DecisionTicketPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = base64UrlEncode(await hmacSha256(secret, body));
  return `${body}.${signature}`;
}

export async function verifyDecisionTicket(token: string, secret: string, now = Date.now()): Promise<{ ok: true; payload: DecisionTicketPayload } | { ok: false; error: TicketVerifyError }> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "ticket_invalid" };
  const [body, providedSig] = parts;
  const expected = await hmacSha256(secret, body);
  const actual = base64UrlDecode(providedSig);
  if (!(await timingSafeEqualBytes(expected, actual))) return { ok: false, error: "ticket_tampered" };
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
  } catch {
    return { ok: false, error: "ticket_invalid" };
  }
  const parsed = decisionTicketPayloadSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "ticket_invalid" };
  if (parsed.data.exp < now) return { ok: false, error: "ticket_expired" };
  return { ok: true, payload: parsed.data };
}

/** Ticket lifetime: small grace + the level time limit so the browser can finish within the round window. */
export function ticketExpiresAt(now: number, limitMs: number, graceMs = 15_000) {
  return now + graceMs + limitMs;
}
