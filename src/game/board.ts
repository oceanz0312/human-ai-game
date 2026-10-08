import type { GridSize } from "./contracts";

/** Raster geometry shared by the level generator and the transparent touch grid. */
export const LEVEL_IMAGE_SIZE = 1080;
export const LEVEL_IMAGE_MARGIN = 24;

export const TILE_GAP: Record<GridSize, number> = { 3: 24, 9: 8 };
export const TILE_RADIUS: Record<GridSize, number> = { 3: 33, 9: 19 };

export const BOARD_INSET_PERCENT = (LEVEL_IMAGE_MARGIN / LEVEL_IMAGE_SIZE) * 100;
