import type { GamePlugin } from "../../core/game-plugin";
import { buildSpotTheDifferenceTask } from "../../models/tasks/spot-the-difference";
import { LEVELS_V1, type LevelSpec } from "../../server/levels/spec";

export interface SpotPublicLevel {
  version: LevelSpec["version"];
  level: number;
  gridSize: LevelSpec["gridSize"];
  limitMs: number;
  imageUrl: string;
  choices: string[];
}

export const SPOT_THE_DIFFERENCE_SLUG = "spot-the-difference";

/**
 * Spot-the-difference plugin. Pure: image bytes come from the injected loader (ASSETS binding on
 * Cloudflare, filesystem locally, a stub in tests).
 */
export function createSpotTheDifferencePlugin(deps: { loadImageDataUrl: (level: LevelSpec) => Promise<string> }): GamePlugin<
  LevelSpec,
  SpotPublicLevel,
  { gridSize: LevelSpec["gridSize"]; imageUrl: string }
> {
  const getLevel = (levelNumber: number) => {
    const found = LEVELS_V1.find((item) => item.level === levelNumber);
    if (!found) throw new Error(`Unknown v1 level: ${levelNumber}`);
    return found;
  };
  return {
    slug: SPOT_THE_DIFFERENCE_SLUG,
    levelSetVersion: "v1",
    totalLevels: LEVELS_V1.length,
    startingChances: 3,
    levels: () => LEVELS_V1,
    getLevel,
    toPublicLevel: (level) => ({
      version: level.version,
      level: level.level,
      gridSize: level.gridSize,
      limitMs: level.limitMs,
      imageUrl: level.imageUrl,
      choices: level.choices,
    }),
    choices: (level) => level.choices,
    isValidAnswer: (level, answer) => level.choices.includes(answer),
    judge: (level, answer) => answer === level.correctChoice,
    correctAnswer: (level) => level.correctChoice,
    revealFields: (level) => ({ gridSize: level.gridSize, imageUrl: level.imageUrl }),
    async buildDecisionInput(level) {
      const imageDataUrl = await deps.loadImageDataUrl(level);
      const task = buildSpotTheDifferenceTask({ imageDataUrl, choices: level.choices });
      return { imageDataUrl, choices: level.choices, task: { name: task.name, instructions: task.instructions, choices: task.choices } };
    },
  };
}
