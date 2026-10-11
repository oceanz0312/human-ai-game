"use client";

import { BOARD_INSET_PERCENT } from "@/game/board";
import { heatmapAlpha } from "@/game/ai-insights";
import type { GridSize } from "@/game/contracts";

interface RevealHeatmapBoardProps {
  gridSize: GridSize;
  imageUrl: string;
  probabilities: Record<string, number> | null;
  aiChoice: string | null;
  correctChoice: string | null;
}

export function RevealHeatmapBoard({ gridSize, imageUrl, probabilities, aiChoice, correctChoice }: RevealHeatmapBoardProps) {
  const cells = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize) + 1;
    const column = (index % gridSize) + 1;
    return { id: `r${row}c${column}`, row, column };
  });
  const maxProbability = probabilities ? Math.max(0, ...Object.values(probabilities)) : 0;

  return (
    <div className={`board reveal-board size-${gridSize}`} data-testid="reveal-board">
      {/* eslint-disable-next-line @next/next/no-img-element -- same raster the player saw in play */}
      <img src={imageUrl} alt="" draggable={false} decoding="async" />
      <div
        className="grid reveal-grid"
        role="img"
        aria-label="AI 各格子的判断概率热力图"
        style={{
          inset: `${BOARD_INSET_PERCENT}%`,
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {cells.map((cell) => {
          const probability = probabilities?.[cell.id] ?? 0;
          const alpha = heatmapAlpha(probability, maxProbability);
          const markers: string[] = [];
          if (aiChoice === cell.id) markers.push("ai-pick");
          if (correctChoice === cell.id) markers.push("correct-pick");
          return (
            <div
              key={cell.id}
              className={markers.length ? `heatmap-cell ${markers.join(" ")}` : "heatmap-cell"}
              style={{ backgroundColor: alpha > 0 ? `rgba(17, 17, 17, ${alpha.toFixed(3)})` : undefined }}
              aria-label={`第 ${cell.row} 行第 ${cell.column} 列${probability > 0 ? `，概率 ${Math.round(probability * 100)}%` : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
