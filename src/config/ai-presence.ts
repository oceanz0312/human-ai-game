/**
 * Client-side presence cues of the AI opponent + quick-round pacing. Browser-safe: cosmetic timings and copy only.
 * Nothing here depends on (or reveals) a round's answer, its AI correctness or its AI answer time.
 *
 * Formal game: the board shows "AI got the picture" `gotPictureMs` after the level image is painted, then rotates the
 * band's scan captions every `captionEveryMs` from `scanStartMs` until the server's real "answered"/"error" event.
 * "AI answered 🔒" only ever comes from the server.
 */
export interface PresenceBand {
  fromLevel: number;
  toLevel: number;
  scanStartMs: number;
  captionEveryMs: number;
  /** Source-language (zh) message keys, translated by src/i18n/messages. */
  captions: string[];
}

export const AI_PRESENCE = {
  gotPictureMs: { min: 120, max: 180 },
  bands: [
    { fromLevel: 1, toLevel: 5, scanStartMs: 450, captionEveryMs: 900, captions: ["AI 正在扫描画面…", "AI 正在比对每一格…", "AI 正在复查…"] },
    { fromLevel: 6, toLevel: 14, scanStartMs: 300, captionEveryMs: 600, captions: ["AI 正在扫描画面…", "AI 正在比对每一格…"] },
    { fromLevel: 15, toLevel: 20, scanStartMs: 220, captionEveryMs: 450, captions: ["AI 正在扫描画面…", "AI 正在锁定目标…"] },
  ] satisfies PresenceBand[],
} as const;

export function presenceBand(level: number): PresenceBand {
  return AI_PRESENCE.bands.find((band) => level >= band.fromLevel && level <= band.toLevel) ?? AI_PRESENCE.bands[AI_PRESENCE.bands.length - 1];
}

/** Scan caption shown `elapsedMs` after paint (null before the scan starts). Pure function of level + elapsed. */
export function scanCaptionAt(level: number, elapsedMs: number): string | null {
  const band = presenceBand(level);
  if (elapsedMs < band.scanStartMs) return null;
  const index = Math.floor((elapsedMs - band.scanStartMs) / band.captionEveryMs) % band.captions.length;
  return band.captions[index];
}

/** Quick round (homepage + keyword pages, fully in the browser): presence cues and per-mode AI pacing. */
export const QUICK_PRESENCE = {
  gotPictureMs: 150,
  scanStartMs: 400,
  captionEveryMs: 1200,
  captions: ["Luna AI is scanning the grid…", "Luna AI is comparing tiles…", "Luna AI is double-checking…"],
} as const;

export interface QuickAiPacing {
  /** Per puzzle of the match (3 puzzles). */
  medianMs: number[];
  accuracy: number[];
}

/** Quick puzzles are pixel sprites: people need seconds, so the AI does too (no sub-second snaps here). */
export const QUICK_AI = {
  spread: 0.35,
  minMs: 1200,
  maxFractionOfLimit: 0.9,
  hesitate: { chance: 0.1, minMs: 500, maxMs: 1500 },
  modes: {
    home: { medianMs: [4500, 3800, 3200], accuracy: [0.85, 0.88, 0.9] },
    christmas: { medianMs: [4500, 3800, 3200], accuracy: [0.85, 0.88, 0.9] },
    easy: { medianMs: [6000, 5000, 4500], accuracy: [0.8, 0.82, 0.85] },
    kids: { medianMs: [9000, 8000, 7000], accuracy: [0.75, 0.78, 0.8] },
    find: { medianMs: [4000, 3200, 2600], accuracy: [0.88, 0.9, 0.92] },
    game: { medianMs: [3500, 2800, 2200], accuracy: [0.88, 0.9, 0.92] },
    hard: { medianMs: [2500, 2000, 1600], accuracy: [0.9, 0.92, 0.94] },
  } satisfies Record<string, QuickAiPacing>,
} as const;
