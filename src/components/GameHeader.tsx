import { STARTING_LIVES, TOTAL_LEVELS } from "@/game/contracts";
import { pad2 } from "@/lib/format";
import { useT } from "@/i18n/client";

export function GameHeader({ level, lives }: { level: number; lives: number }) {
  const t = useT();
  return (
    <header className="topline game-header">
      <span className="level" aria-label={t("第 {level} 关，共 {total} 关", { level, total: TOTAL_LEVELS })}>
        {pad2(level)} / {TOTAL_LEVELS}
      </span>
      <span className="lives" role="img" aria-label={t("剩余 {lives} 次机会", { lives })}>
        {Array.from({ length: STARTING_LIVES }, (_, index) => (
          <span key={index} className={index < lives ? "life" : "life lost"} />
        ))}
      </span>
    </header>
  );
}
