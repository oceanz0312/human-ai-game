/**
 * Where the formal 20-level run's simulated AI turns brutal, for page copy ("The AI gets brutal around level N").
 * TODO(sim-ai-v2): replace with the first level of the last band in FORMAL_DIFFICULTY (src/config/ai-difficulty.ts)
 * once the sim-AI v2 curve (levels 1–5 easy, mid contested, 15–20 AI dominates) has landed on main.
 */
export const AI_BRUTAL_FROM_LEVEL = 15;

/** Honest difficulty line for page copy (must match the sim-AI curve). */
export const AI_CURVE_LINE = `Start easy. The AI gets brutal around level ${AI_BRUTAL_FROM_LEVEL} — most players hit a wall there. Can you beat it?`;
