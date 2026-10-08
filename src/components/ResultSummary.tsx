import type { ResultView } from "@/game/contracts";
import { pad2 } from "@/lib/format";

export function ResultSummary({ result }: { result: ResultView }) {
  return (
    <>
      <section className="hero-number">
        <div className="big-number" data-testid="reached-level">
          {pad2(result.reachedLevel)}
        </div>
        <div className="big-label">{result.cleared ? "通关 · 到达关卡" : "到达关卡"}</div>
      </section>
      <section className="stats">
        <div className="row">
          <span className="label">比 AI 更快</span>
          <span className="value" data-testid="faster-count">
            {result.fasterThanAiCount} <small>关</small>
          </span>
        </div>
        <div className="row">
          <span className="label">全服排名</span>
          <span className="value" data-testid="rank">
            <small>第</small>
            {result.rank} <small>名</small>
          </span>
        </div>
        <div className="row">
          <span className="label">个人最佳</span>
          <span className="value">
            <small>第</small>
            {result.bestLevel} <small>关</small>
          </span>
        </div>
      </section>
    </>
  );
}
