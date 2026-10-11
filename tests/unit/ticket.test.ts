// @vitest-environment node
import { signDecisionTicket, verifyDecisionTicket } from "@/server/decisions/ticket";

const SECRET = "ticket-test-secret-with-enough-entropy-0123456789";
const basePayload = {
  v: 1 as const,
  jti: "11111111-1111-4111-8111-111111111111",
  roundId: "round-12345678",
  sessionId: "session-12345678",
  level: 3,
  imageSha256: "a".repeat(64),
  choices: Array.from({ length: 9 }, (_, i) => `r${Math.floor(i / 3) + 1}c${(i % 3) + 1}`),
  iat: 1_000_000,
  exp: 1_010_000,
};

test("signs and verifies a ticket within its expiry window", async () => {
  const token = await signDecisionTicket(basePayload, SECRET);
  const verified = await verifyDecisionTicket(token, SECRET, 1_005_000);
  expect(verified.ok).toBe(true);
  if (verified.ok) expect(verified.payload.roundId).toBe(basePayload.roundId);
});

test("rejects tampered, expired, and wrong-secret tickets", async () => {
  const token = await signDecisionTicket(basePayload, SECRET);
  const tampered = `${token.slice(0, -1)}x`;
  expect((await verifyDecisionTicket(tampered, SECRET)).ok).toBe(false);
  expect((await verifyDecisionTicket(token, SECRET, 2_000_000)).ok).toBe(false);
  expect((await verifyDecisionTicket(token, "another-secret-that-is-long-enough-123456")).ok).toBe(false);
});
