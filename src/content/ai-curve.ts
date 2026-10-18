import { FORMAL_DIFFICULTY } from "@/config/ai-difficulty";

/**
 * Where the formal 20-level run's simulated AI turns brutal, for page copy ("The AI gets brutal around level N"):
 * the first level of the last band of the sim-AI v2 curve (src/config/ai-difficulty.ts; 15 as of 2026-10-18).
 * Server-rendered copy only (keyword pages, i18n pages): never import this from a client component.
 */
export const AI_BRUTAL_FROM_LEVEL = FORMAL_DIFFICULTY.bands[FORMAL_DIFFICULTY.bands.length - 1].fromLevel;

/** Honest difficulty line for page copy (must match the sim-AI curve). */
export const AI_CURVE_LINE = `Start easy. The AI gets brutal around level ${AI_BRUTAL_FROM_LEVEL} — most players hit a wall there. Can you beat it?`;
