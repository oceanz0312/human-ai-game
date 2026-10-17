import { randomUUID } from "node:crypto";
import { createPluginRegistry, type GamePlugin } from "@/core/game-plugin";
import { createSpotTheDifferencePlugin } from "@/games/spot-the-difference/server-plugin";
import { FakeDecisionClient } from "@/server/decisions/fake";
import { createGameService } from "@/server/game-service";
import { createGameRepository, createLeaderboardRepository } from "@/server/repositories/game-repository";
import { createTestDatabase } from "../helpers/test-db";

/**
 * Proves the core is game-agnostic: a tiny stub game ("odd-word": pick the word that doesn't belong)
 * registers through the plugin interface only — no core code knows about it — and plays a full run
 * against the server-initiated AI with the answer hidden until lock-in.
 */
interface WordLevel {
  level: number;
  limitMs: number;
  words: string[];
  odd: string;
}

const WORD_LEVELS: WordLevel[] = [
  { level: 1, limitMs: 5000, words: ["apple", "pear", "plum", "brick"], odd: "brick" },
  { level: 2, limitMs: 4000, words: ["red", "blue", "seven", "green"], odd: "seven" },
];

const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

const oddWord: GamePlugin<WordLevel, { level: number; limitMs: number; words: string[] }, { words: string[] }> = {
  slug: "odd-word",
  levelSetVersion: "odd-word-v0",
  totalLevels: WORD_LEVELS.length,
  startingChances: 2,
  levels: () => WORD_LEVELS,
  getLevel: (n) => WORD_LEVELS[n - 1]!,
  toPublicLevel: ({ level, limitMs, words }) => ({ level, limitMs, words }),
  choices: (level) => level.words,
  isValidAnswer: (level, answer) => level.words.includes(answer),
  judge: (level, answer) => answer === level.odd,
  correctAnswer: (level) => level.odd,
  revealFields: (level) => ({ words: level.words }),
  async buildDecisionInput(level) {
    return {
      imageDataUrl: PIXEL,
      choices: level.words,
      task: {
        name: "odd_word",
        instructions: `Which word does not belong? ${level.words.join(", ")}`,
        choices: level.words.map((value) => ({ value, description: value })),
      },
    };
  },
};

test("a stub second game plays a full run through the game-agnostic core", async () => {
  const { db, cleanup } = await createTestDatabase();
  try {
    let clock = 5_000_000;
    const seenTasks: string[] = [];
    const decisions = new FakeDecisionClient((input) => {
      seenTasks.push(input.task?.name ?? "none");
      // The AI picks the first word: wrong on both levels.
      return { choice: input.choices[0]!, latencyMs: 0 };
    });
    const service = createGameService({
      games: createGameRepository(db),
      leaderboard: createLeaderboardRepository(db),
      decisions,
      now: () => clock,
      randomId: () => randomUUID(),
      randomPublicId: () => randomUUID().replace(/-/g, "").slice(0, 22),
      game: oddWord,
      sleep: async (ms) => {
        clock += ms;
      },
    });
    const playerId = (await service.ensurePlayer(null)).id;
    const session = await service.createSession({ playerId });
    expect(session.lives).toBe(2);

    for (const level of WORD_LEVELS) {
      const started = await service.startNextRound(session.id, playerId);
      expect(started.level).toEqual({ level: level.level, limitMs: level.limitMs, words: level.words });
      const { run } = await service.beginRoundLive(started.round.id, playerId);
      await run!.done;
      // Answer still sealed before lock-in.
      const before = await service.getRound(started.round.id, playerId);
      expect(before.round.correctChoice).toBeNull();
      expect(before.round.ai.choice).toBeNull();
      clock += 800;
      const after = await service.submitRound(started.round.id, playerId, { choice: level.odd, elapsedMs: 800 });
      expect(after.round.correctChoice).toBe(level.odd);
      expect(after.round.human?.status).toBe("correct");
      expect(after.round.ai).toMatchObject({ status: "complete", correct: false, choice: level.words[0] });
      expect(after.round.winner).toBe("human");
      expect((after.round as unknown as { words: string[] }).words).toEqual(level.words);
    }
    const final = await service.getSession(session.id, playerId);
    expect(final).toMatchObject({ status: "ended", cleared: true });
    expect(seenTasks).toEqual(["odd_word", "odd_word"]);
    await expect(service.startNextRound(session.id, playerId)).rejects.toMatchObject({ code: "session_ended" });
  } finally {
    await cleanup();
  }
});

test("plugin registry resolves games by slug and rejects duplicates", () => {
  const spot = createSpotTheDifferencePlugin({ loadImageDataUrl: async () => PIXEL });
  const registry = createPluginRegistry([spot, oddWord as unknown as Parameters<typeof createPluginRegistry>[0][number]]);
  expect(registry.slugs()).toEqual(["spot-the-difference", "odd-word"]);
  expect(registry.get("odd-word").totalLevels).toBe(2);
  expect(() => createPluginRegistry([spot, spot])).toThrow(/duplicate/);
});

test("spot-the-difference sends its normalized task with the decision input", async () => {
  const spot = createSpotTheDifferencePlugin({ loadImageDataUrl: async () => PIXEL });
  const input = await spot.buildDecisionInput(spot.getLevel(1));
  expect(input.task?.name).toBe("odd_cell");
  expect(input.task?.choices).toHaveLength(9);
});
