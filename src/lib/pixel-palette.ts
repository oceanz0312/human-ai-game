/**
 * Pixel-system palette (mirrors src/styles/tokens.css; canvas can't read CSS custom colours reliably
 * before paint, so the values are duplicated here and kept in sync by tests/unit/share.test.ts).
 */
export const POSTER_PALETTE = {
  ink: "#1a1c2c",
  paper: "#f4f4f4",
  surface: "#ffffff",
  muted: "#6b6560",
  line: "#c2c3c7",
  human: "#ff004d",
  humanText: "#c8003c",
  ai: "#29adff",
  aiText: "#0a6abf",
  ok: "#00e436",
  hi: "#ffec27",
  termFg: "#c2c3c7",
  termDim: "#83769c",
  gridDot: "#d9d9dc",
} as const;
