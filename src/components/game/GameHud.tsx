"use client";

import { STARTING_LIVES, TOTAL_LEVELS } from "@/game/contracts";
import { countdown, pad2 } from "@/lib/format";
import { useT } from "@/i18n/client";
import { SegmentedProgress } from "@/components/ui/8bit";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Level, misses left (「机会」) and the countdown. One element: a side card on desktop, the top bar on mobile. */
export function GameHud({
  level,
  chances,
  remainingMs,
  limitMs,
  totalLevels = TOTAL_LEVELS,
  startingChances = STARTING_LIVES,
  badge,
}: {
  level: number;
  chances: number;
  remainingMs: number | null;
  limitMs: number;
  totalLevels?: number;
  startingChances?: number;
  /** Core FX slot (COMBO / STREAK). */
  badge?: ReactNode;
}) {
  const t = useT();
  // F3: the chance block that was just lost shatters once.
  const previous = useRef(chances);
  const [lostIndex, setLostIndex] = useState<number | null>(null);
  useEffect(() => {
    if (chances < previous.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot animation trigger on a prop drop
      setLostIndex(chances);
      const timer = window.setTimeout(() => setLostIndex(null), 600);
      previous.current = chances;
      return () => window.clearTimeout(timer);
    }
    previous.current = chances;
  }, [chances]);
  const remaining = remainingMs ?? limitMs;
  const ratio = limitMs > 0 ? Math.max(0, Math.min(1, remaining / limitMs)) : 0;
  return (
    <div className="game-header hud-card">
      <div className="hud-level">
        <span className="hud-label">{t("关卡")}</span>
        <span className="level hud-value num" aria-label={t("第 {level} 关，共 {total} 关", { level, total: totalLevels })}>
          {pad2(level)} / {totalLevels}
        </span>
        {badge}
      </div>
      <div className={remaining < 1000 ? "timer urgent" : "timer"} aria-live="off">
        <span className="hud-label">{t("剩余时间")}</span>
        <span className="hud-timer num">
          <span className="value" data-testid="timer">
            {countdown(remaining)}
          </span>
          <span className="unit">{t("秒")}</span>
        </span>
        <SegmentedProgress className="hud-segments" value={ratio} segments={12} />
      </div>
      <div className="hud-chances">
        <span className="hud-label">{t("机会")}</span>
        <span className={chances === 1 ? "chances is-last" : "chances"} role="img" aria-label={t("剩余 {lives} 次机会", { lives: chances })}>
          {Array.from({ length: startingChances }, (_, index) => (
            <span key={index} className={`${index < chances ? "chance" : "chance used"}${index === lostIndex ? " just-lost" : ""}`} />
          ))}
        </span>
      </div>
    </div>
  );
}
