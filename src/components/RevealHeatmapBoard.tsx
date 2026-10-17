"use client";

import { BOARD_INSET_PERCENT } from "@/game/board";
import { heatmapAlpha } from "@/game/ai-insights";
import type { GridSize } from "@/game/contracts";
import { useT } from "@/i18n/client";

/** Pixel heatmap: quantise the AI's probability into three flat steps instead of a smooth ramp. */
const heatStep = (alpha: number) => (alpha > 0.66 ? 3 : alpha > 0.33 ? 2 : alpha > 0.12 ? 1 : undefined);

interface RevealHeatmapBoardProps {
  gridSize: GridSize;
  imageUrl: string;
  probabilities: Record<string, number> | null;
  aiChoice: string | null;
  correctChoice: string | null;
  humanChoice?: string | null;
}

export function RevealHeatmapBoard({ gridSize, imageUrl, probabilities, aiChoice, correctChoice, humanChoice = null }: RevealHeatmapBoardProps) {
  const t = useT();
  const cells = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize) + 1;
    const column = (index % gridSize) + 1;
    return { id: `r${row}c${column}`, row, column };
  });
  const maxProbability = probabilities ? Math.max(0, ...Object.values(probabilities)) : 0;

  return (
    <div className={`board reveal-board size-${gridSize}`} data-testid="reveal-board">
      {/* eslint-disable-next-line @next/next/no-img-element -- same raster the player saw in play */}
      <img src={imageUrl} alt="" draggable={false} decoding="sync" />
      <div
        className="grid reveal-grid"
        role="img"
        aria-label={t("AI 各格子的判断概率热力图")}
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
          if (humanChoice === cell.id) markers.push("human-pick");
          return (
            <div
              key={cell.id}
              className={markers.length ? `heatmap-cell ${markers.join(" ")}` : "heatmap-cell"}
              data-heat={alpha > 0 ? heatStep(alpha) : undefined}
              data-answer={cell.id}
              style={alpha > 0 ? ({ "--heat": alpha.toFixed(3) } as React.CSSProperties) : undefined}
              aria-label={`${t("第 {row} 行第 {col} 列", { row: cell.row, col: cell.column })}${probability > 0 ? t("，概率 {p}%", { p: Math.round(probability * 100) }) : ""}`}
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
