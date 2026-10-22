"use client";

import { BOARD_INSET_PERCENT } from "@/game/board";
import type { GridSize } from "@/game/contracts";
import { useT } from "@/i18n/client";

interface RevealHeatmapBoardProps {
  gridSize: GridSize;
  imageUrl: string;
  /** Kept for API compatibility; probabilities are shown only in the AI details sheet. */
  probabilities: Record<string, number> | null;
  aiChoice: string | null;
  correctChoice: string | null;
  humanChoice?: string | null;
}

export function RevealHeatmapBoard({ gridSize, imageUrl, probabilities: _probabilities, aiChoice, correctChoice, humanChoice = null }: RevealHeatmapBoardProps) {
  const t = useT();
  const cells = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize) + 1;
    const column = (index % gridSize) + 1;
    return { id: `r${row}c${column}`, row, column };
  });

  return (
    <div className={`board reveal-board size-${gridSize}`} data-testid="reveal-board">
      {/* eslint-disable-next-line @next/next/no-img-element -- same raster the player saw in play */}
      <img src={imageUrl} alt="" draggable={false} decoding="sync" />
      <div
        className="grid reveal-grid"
        role="img"
        aria-label={t("揭晓棋盘")}
        style={{
          inset: `${BOARD_INSET_PERCENT}%`,
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {cells.map((cell) => {
          const markers: string[] = [];
          if (aiChoice === cell.id) markers.push("ai-pick");
          if (correctChoice === cell.id) markers.push("correct-pick");
          if (humanChoice === cell.id) markers.push("human-pick");
          return (
            <div
              key={cell.id}
              className={markers.length ? `heatmap-cell ${markers.join(" ")}` : "heatmap-cell"}
              data-answer={cell.id}
              aria-label={t("第 {row} 行第 {col} 列", { row: cell.row, col: cell.column })}
            >
              {aiChoice === cell.id ? <span className="pick-tag pick-tag-ai">AI</span> : null}
              {humanChoice === cell.id ? <span className="pick-tag pick-tag-you">{t("你")}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
