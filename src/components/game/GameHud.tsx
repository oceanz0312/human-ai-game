"use client";

import { STARTING_LIVES, TOTAL_LEVELS } from "@/game/contracts";
import { countdown, pad2 } from "@/lib/format";
import { useT } from "@/i18n/client";

/** Level, misses left (「机会」) and the countdown. One element: a side card on desktop, the top bar on mobile. */
export function GameHud({ level, chances, remainingMs, limitMs }: { level: number; chances: number; remainingMs: number | null; limitMs: number }) {
  const t = useT();
  const remaining = remainingMs ?? limitMs;
  const ratio = limitMs > 0 ? Math.max(0, Math.min(1, remaining / limitMs)) : 0;
  const segments = 12;
  const lit = Math.ceil(ratio * segments);
  return (
    <div className="game-header hud-card">
      <div className="hud-level">
        <span className="hud-label">{t("关卡")}</span>
        <span className="level hud-value num" aria-label={t("第 {level} 关，共 {total} 关", { level, total: TOTAL_LEVELS })}>
          {pad2(level)} / {TOTAL_LEVELS}
        </span>
      </div>
      <div className={remaining < 1000 ? "timer urgent" : "timer"} aria-live="off">
        <span className="hud-label">{t("剩余时间")}</span>
        <span className="hud-timer num">
          <span className="value" data-testid="timer">
            {countdown(remaining)}
          </span>
          <span className="unit">{t("秒")}</span>
        </span>
        <span className="hud-segments" aria-hidden>
          {Array.from({ length: segments }, (_, index) => (
            <i key={index} className={index < lit ? "on" : undefined} />
          ))}
        </span>
      </div>
      <div className="hud-chances">
        <span className="hud-label">{t("机会")}</span>
        <span className="chances" role="img" aria-label={t("剩余 {lives} 次机会", { lives: chances })}>
          {Array.from({ length: STARTING_LIVES }, (_, index) => (
            <span key={index} className={index < chances ? "chance" : "chance used"} />
          ))}
        </span>
      </div>
    </div>
  );
}
