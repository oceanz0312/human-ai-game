import type { ReactNode } from "react";

/**
 * One-screen game layout shared by countdown, play, error and reveal so the board never moves or resizes.
 * Desktop/landscape: board column (lane, board, foot) + side panel. Mobile/portrait: one stacked column
 * (hud, lane, board, foot, extra) — the column and side use `display: contents` so CSS `order` can interleave them.
 */
export function GameStage({
  topBar,
  hud,
  lane,
  board,
  foot,
  side,
  extra,
  phase,
  overlay,
}: {
  topBar: ReactNode;
  /** Top of the side panel on desktop; fixed-height bar above the lane on mobile. */
  hud: ReactNode;
  lane: ReactNode;
  board: ReactNode;
  /** Fixed-height row directly under the board (hint on play, 下一关 on reveal). */
  foot: ReactNode;
  /** Rest of the side panel (desktop) / remaining space under the foot (mobile, clipped). */
  side: ReactNode;
  extra?: ReactNode;
  phase: string;
  overlay?: ReactNode;
}) {
  return (
    <main className="game-stage" data-phase={phase}>
      {topBar}
      <div className="game-grid">
        <section className="game-col">
          <div className="game-lane">{lane}</div>
          <div className="board-stage">
            {board}
            {overlay}
          </div>
          <div className="game-foot">{foot}</div>
        </section>
        <aside className="game-side">
          <div className="game-hud">{hud}</div>
          <div className="game-side-body">{side}</div>
        </aside>
      </div>
      {extra}
    </main>
  );
}
