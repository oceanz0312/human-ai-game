import { advanceSession, NETWORK_TOLERANCE_MS, reconcileElapsed, resolveHumanAnswer, resolveRace } from "@/game/rules";

test("an incorrect answer removes one life and advances", () => {
  const human = resolveHumanAnswer({ choice: "r1c1", correctChoice: "r2c2", elapsedMs: 1200, limitMs: 8000 });
  expect(human).toEqual({ status: "incorrect", correct: false, elapsedMs: 1200 });
  expect(advanceSession({ level: 4, lives: 3, humanStatus: human.status })).toEqual({ nextLevel: 5, lives: 2, ended: false, cleared: false });
});

test("a correct answer keeps lives and advances", () => {
  expect(advanceSession({ level: 6, lives: 2, humanStatus: "correct" })).toEqual({ nextLevel: 7, lives: 2, ended: false, cleared: false });
});

test("the third failure ends the run at the reached level", () => {
  expect(advanceSession({ level: 8, lives: 1, humanStatus: "timeout" })).toEqual({ nextLevel: null, lives: 0, ended: true, cleared: false });
});

test("level 20 ends the run and clears it while lives remain", () => {
  expect(advanceSession({ level: 20, lives: 2, humanStatus: "correct" })).toEqual({ nextLevel: null, lives: 2, ended: true, cleared: true });
  expect(advanceSession({ level: 20, lives: 1, humanStatus: "incorrect" })).toEqual({ nextLevel: null, lives: 0, ended: true, cleared: false });
});

test("a missing choice or an answer past the limit is a timeout", () => {
  expect(resolveHumanAnswer({ choice: null, correctChoice: "r1c1", elapsedMs: 8000, limitMs: 8000 }).status).toBe("timeout");
  expect(resolveHumanAnswer({ choice: "r1c1", correctChoice: "r1c1", elapsedMs: 8001, limitMs: 8000 }).status).toBe("timeout");
});

test("faster count increases only when both are correct and the human is strictly faster", () => {
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 2480, aiStatus: "complete", aiCorrect: true, aiElapsedMs: 2910 })).toEqual({ winner: "human", fasterThanAi: true });
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 2480, aiStatus: "complete", aiCorrect: false, aiElapsedMs: 1900 })).toEqual({ winner: "human", fasterThanAi: false });
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 2910, aiStatus: "complete", aiCorrect: true, aiElapsedMs: 2910 })).toEqual({ winner: "ai", fasterThanAi: false });
  expect(resolveRace({ humanCorrect: false, humanElapsedMs: 1000, aiStatus: "complete", aiCorrect: true, aiElapsedMs: 2000 })).toEqual({ winner: "ai", fasterThanAi: false });
  expect(resolveRace({ humanCorrect: false, humanElapsedMs: 1000, aiStatus: "complete", aiCorrect: false, aiElapsedMs: 2000 })).toEqual({ winner: "none", fasterThanAi: false });
});

test("AI errors never count as a speed win", () => {
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 900, aiStatus: "error", aiCorrect: null, aiElapsedMs: null })).toEqual({ winner: "human", fasterThanAi: false });
  expect(resolveRace({ humanCorrect: false, humanElapsedMs: 900, aiStatus: "error", aiCorrect: null, aiElapsedMs: null })).toEqual({ winner: "none", fasterThanAi: false });
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 900, aiStatus: "running", aiCorrect: null, aiElapsedMs: null }).winner).toBe("pending");
});

test("client-reported time is clamped into the server-observed window", () => {
  expect(reconcileElapsed({ clientElapsedMs: 2400, serverElapsedMs: 2600 })).toBe(2400);
  expect(reconcileElapsed({ clientElapsedMs: 100, serverElapsedMs: 6000 })).toBe(6000 - NETWORK_TOLERANCE_MS);
  expect(reconcileElapsed({ clientElapsedMs: 9000, serverElapsedMs: 3000 })).toBe(3000);
});
