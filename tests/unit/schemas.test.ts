import { describe, expect, it } from "vitest";
import { analyticsEventSchema, nicknameSchema, startSessionSchema, submitRoundSchema } from "@/game/schemas";
import { decisionRequestSchema, internalOpenAiDecideRequestSchema, workerAiResultReportSchema, workerDecisionResponseSchema } from "@/server/decisions/contracts";

// Guards the zod → zod/mini migration (PR-E): the accept/reject behaviour of every wire schema must not change.
const uuid = "123e4567-e89b-42d3-a456-426614174000";
const png = "data:image/png;base64,AAAA";

describe("wire schemas", () => {
  it("startSession: trims nickname, validates ai slug and player key", () => {
    expect(startSessionSchema.parse({ nickname: "  Bo  ", pk: uuid })).toEqual({ nickname: "Bo", pk: uuid });
    expect(startSessionSchema.safeParse({ nickname: "   ", pk: uuid }).success).toBe(false);
    expect(startSessionSchema.safeParse({ nickname: "x".repeat(25), pk: uuid }).success).toBe(false);
    expect(startSessionSchema.safeParse({ ai: "Bad Slug", pk: uuid }).success).toBe(false);
    expect(startSessionSchema.safeParse({ ai: "gpt-5", pk: uuid }).success).toBe(true);
    expect(startSessionSchema.safeParse({ pk: "not-a-uuid" }).success).toBe(false);
    expect(startSessionSchema.safeParse({}).success).toBe(false);
  });

  it("submitRound: nullable opaque choice, integer elapsed within bounds", () => {
    expect(submitRoundSchema.safeParse({ choice: "r2c2", elapsedMs: 1200 }).success).toBe(true);
    expect(submitRoundSchema.safeParse({ choice: null, elapsedMs: 0 }).success).toBe(true);
    expect(submitRoundSchema.safeParse({ choice: "a b", elapsedMs: 1 }).success).toBe(false);
    expect(submitRoundSchema.safeParse({ choice: "a", elapsedMs: 1.5 }).success).toBe(false);
    expect(submitRoundSchema.safeParse({ choice: "a", elapsedMs: -1 }).success).toBe(false);
    expect(submitRoundSchema.safeParse({ choice: "a", elapsedMs: 60_001 }).success).toBe(false);
    expect(submitRoundSchema.safeParse({ elapsedMs: 1 }).success).toBe(false);
  });

  it("nickname and analytics", () => {
    expect(nicknameSchema.parse({ nickname: " a " })).toEqual({ nickname: "a" });
    expect(analyticsEventSchema.safeParse({ name: "game_start", clientTs: 1, sessionId: null, level: null }).success).toBe(true);
    expect(analyticsEventSchema.safeParse({ name: "nope", clientTs: 1 }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ name: "game_start", clientTs: 0 }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ name: "game_start", clientTs: 1, level: 501 }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ name: "game_start", clientTs: 1, metadata: { a: "x", b: 1, c: true, d: null } }).success).toBe(true);
    expect(analyticsEventSchema.safeParse({ name: "game_start", clientTs: 1, metadata: { a: "x".repeat(201) } }).success).toBe(false);
    const big = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, "x".repeat(150)]));
    expect(analyticsEventSchema.safeParse({ name: "game_start", clientTs: 1, metadata: big }).success).toBe(false);
  });

  it("decision request refinements survive extend", () => {
    const ok = { imageDataUrl: png, choices: ["a", "b"] };
    expect(decisionRequestSchema.safeParse(ok).success).toBe(true);
    expect(decisionRequestSchema.safeParse({ ...ok, choices: ["a", "a"] }).success).toBe(false);
    expect(decisionRequestSchema.safeParse({ ...ok, choices: ["a"] }).success).toBe(false);
    expect(decisionRequestSchema.safeParse({ ...ok, imageDataUrl: "data:image/gif;base64,AA" }).success).toBe(false);
    const task = { name: "spot", instructions: "x", choices: [{ value: "a", description: "" }, { value: "c", description: "" }] };
    expect(decisionRequestSchema.safeParse({ ...ok, task }).success).toBe(false);
    expect(internalOpenAiDecideRequestSchema.safeParse({ ...ok, requestId: "r" }).success).toBe(true);
    expect(internalOpenAiDecideRequestSchema.safeParse({ ...ok, choices: ["a", "a"], requestId: "r" }).success).toBe(false);
    expect(internalOpenAiDecideRequestSchema.safeParse(ok).success).toBe(false);
  });

  it("worker response and AI result report", () => {
    const res = { status: "complete", choice: "a", confidence: 0.5, probabilities: { a: 0.5 }, modelElapsedMs: 10, errorCode: null, requestId: "r" };
    expect(workerDecisionResponseSchema.safeParse(res).success).toBe(true);
    expect(workerDecisionResponseSchema.safeParse({ ...res, confidence: 1.1 }).success).toBe(false);
    expect(workerDecisionResponseSchema.safeParse({ ...res, errorCode: "bogus" }).success).toBe(false);
    expect(workerAiResultReportSchema.safeParse({ roundId: "12345678", jti: uuid, result: res }).success).toBe(true);
    expect(workerAiResultReportSchema.safeParse({ roundId: "1234567", jti: uuid, result: res }).success).toBe(false);
  });
});
