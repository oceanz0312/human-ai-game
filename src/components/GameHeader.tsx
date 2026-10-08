import { STARTING_LIVES, TOTAL_LEVELS } from "@/game/contracts";
import { pad2 } from "@/lib/format";

export function GameHeader({ level, lives }: { level: number; lives: number }) {
  return (
    <header className="topline game-header">
      <span className="level" aria-label={`第 ${level} 关，共 ${TOTAL_LEVELS} 关`}>
        {pad2(level)} / {TOTAL_LEVELS}
      </span>
      <span className="lives" role="img" aria-label={`剩余 ${lives} 条命`}>
        {Array.from({ length: STARTING_LIVES }, (_, index) => (
          <span key={index} className={index < lives ? "life" : "life lost"} />
        ))}
      </span>
    </header>
  );
}
