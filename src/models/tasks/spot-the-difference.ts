import type { VisionChoiceTask } from "../types";

export function gridSizeFromChoices(choices: string[]) {
  return choices.length === 81 ? 9 : 3;
}

export function buildOddCellInstructions(gridSize: number) {
  return [
    `The image shows a ${gridSize} by ${gridSize} grid of tiles.`,
    "Every tile contains the same pattern except exactly one tile, which differs in shape, orientation, mirroring, color, shade, a missing or extra part, or a small positional offset.",
    `Rows are numbered 1 to ${gridSize} from top to bottom and columns 1 to ${gridSize} from left to right.`,
    "Which tile is the odd one out?",
  ].join(" ");
}

/** Spot-the-difference round → provider-agnostic vision choice task. Identical prompt for every model (fairness). */
export function buildSpotTheDifferenceTask(input: { imageDataUrl: string; choices: string[] }): VisionChoiceTask {
  return {
    kind: "vision-single-choice",
    name: "odd_cell",
    imageDataUrl: input.imageDataUrl,
    instructions: buildOddCellInstructions(gridSizeFromChoices(input.choices)),
    choices: input.choices.map((value) => {
      const [, row, column] = /^r(\d)c(\d)$/.exec(value) ?? [];
      return { value, description: `row ${row}, column ${column}` };
    }),
  };
}
