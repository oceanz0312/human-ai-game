import type { GridSize } from "../../game/contracts";
import { gridPositions } from "../../game/rules";

export type VisualKind =
  | "emoji"
  | "color"
  | "arrow"
  | "missing-part"
  | "text"
  | "shape"
  | "rotation"
  | "shade"
  | "mirror"
  | "gap"
  | "rotation-noise"
  | "negative-space"
  | "composite"
  | "offset";

export interface LevelSpec {
  version: "v1";
  level: number;
  gridSize: GridSize;
  limitMs: number;
  correctChoice: string;
  choices: string[];
  imageUrl: string;
  visual: { kind: VisualKind; normal: string; odd: string };
}

const level = (levelNumber: number, gridSize: GridSize, limitMs: number, correctChoice: string, visual: LevelSpec["visual"]): LevelSpec => ({
  version: "v1",
  level: levelNumber,
  gridSize,
  limitMs,
  correctChoice,
  choices: gridPositions(gridSize),
  imageUrl: `/levels/v1/${String(levelNumber).padStart(2, "0")}.png`,
  visual,
});

/**
 * Frozen v1 level set. Changing any image, answer, position, or time limit requires a new
 * levelSetVersion and a separate leaderboard. This module is imported only by server code and
 * build scripts; the client receives the projection in src/levels/public-catalog.generated.ts.
 */
export const LEVELS_V1: LevelSpec[] = [
  level(1, 3, 8000, "r2c2", { kind: "emoji", normal: "smile", odd: "heart" }),
  level(2, 3, 8000, "r1c3", { kind: "color", normal: "blue-dot", odd: "orange-dot" }),
  level(3, 3, 7000, "r3c1", { kind: "arrow", normal: "right", odd: "left" }),
  level(4, 3, 7000, "r1c2", { kind: "missing-part", normal: "face-two-eyes", odd: "face-one-eye" }),
  level(5, 3, 6000, "r3c3", { kind: "text", normal: "O", odd: "0" }),
  level(6, 9, 7000, "r5c7", { kind: "shape", normal: "circle", odd: "diamond" }),
  level(7, 9, 6500, "r2c8", { kind: "rotation", normal: "arrow-up", odd: "arrow-up-rotated-18" }),
  level(8, 9, 6000, "r7c4", { kind: "text", normal: "未", odd: "末" }),
  level(9, 9, 5500, "r4c6", { kind: "missing-part", normal: "box-dot", odd: "box" }),
  level(10, 9, 5000, "r8c2", { kind: "shade", normal: "#3C3C3C", odd: "#5A5A5A" }),
  level(11, 9, 4800, "r3c5", { kind: "mirror", normal: "flag-right", odd: "flag-left" }),
  level(12, 9, 4600, "r6c9", { kind: "gap", normal: "ring-gap-top", odd: "ring-gap-right" }),
  level(13, 9, 4400, "r1c6", { kind: "rotation-noise", normal: "double-line", odd: "double-line-rotated-12" }),
  level(14, 9, 4200, "r9c5", { kind: "negative-space", normal: "hole-left", odd: "hole-right" }),
  level(15, 9, 4000, "r5c3", { kind: "composite", normal: "three-node", odd: "two-node" }),
  level(16, 9, 3800, "r2c2", { kind: "text", normal: "土", odd: "士" }),
  level(17, 9, 3600, "r7c8", { kind: "mirror", normal: "low-contrast-hook-right", odd: "low-contrast-hook-left" }),
  level(18, 9, 3400, "r4c4", { kind: "offset", normal: "nodes-centered", odd: "nodes-offset" }),
  level(19, 9, 3200, "r8c7", { kind: "gap", normal: "micro-gap-bottom", odd: "micro-gap-left" }),
  level(20, 9, 3000, "r6c5", { kind: "offset", normal: "four-part-centered", odd: "four-part-shifted" }),
];
