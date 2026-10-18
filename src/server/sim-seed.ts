import "server-only";
import { createHmac } from "node:crypto";
import { derivedKey } from "./identity";

let key: Buffer | null = null;

/**
 * Seed of the simulated AI for one round: HMAC(derived key, round id). The round id is visible to the browser and
 * the sampler ships in the client bundle, so a bare round-id seed would let anyone precompute the AI's outcome.
 */
export function simSeed(roundId: string) {
  key ??= derivedKey("sim-ai-seed");
  return createHmac("sha256", key).update(`sim-ai|${roundId}`).digest("base64url");
}
