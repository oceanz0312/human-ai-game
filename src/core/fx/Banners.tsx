"use client";

import { useT } from "@/i18n/client";

export type BannerOutcome = "win" | "lose" | "draw" | "none";

/** YOU WIN! / AI WINS / DRAW stamped across the board for ~1.2s, then shrunk to a corner tag (never covers the answer). */
export function ResultBanner({ outcome }: { outcome: BannerOutcome }) {
  const t = useT();
  if (outcome === "none") return null;
  const text = outcome === "win" ? "YOU WIN!" : outcome === "lose" ? "AI WINS" : "DRAW";
  return (
    <div className={`fx-banner fx-banner-${outcome}`} data-testid="result-banner" role="status" aria-label={outcome === "win" ? t("你赢了 AI") : outcome === "lose" ? t("AI 赢了") : t("平局")}>
      <span>{text}</span>
    </div>
  );
}

/** K.O. mark on the AI when it got the level wrong. */
export function KoMark() {
  return (
    <span className="fx-ko" data-testid="ai-ko" aria-hidden>
      K.O.
    </span>
  );
}

/** COMBO ×N (consecutive correct) / STREAK ×N (consecutive wins over the AI); only shown for N ≥ 2. */
export function StreakCounter({ combo, streak }: { combo: number; streak: number }) {
  if (combo < 2 && streak < 2) return null;
  return (
    <span className="fx-streak" data-testid="streak" aria-live="polite">
      {streak >= 2 ? `STREAK ×${streak}` : `COMBO ×${combo}`}
    </span>
  );
}
