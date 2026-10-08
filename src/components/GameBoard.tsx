"use client";

import { BOARD_INSET_PERCENT } from "@/game/board";
import type { GridSize } from "@/game/contracts";

interface GameBoardProps {
  gridSize: GridSize;
  imageUrl: string | null;
  disabled: boolean;
  selected: string | null;
  loadingLabel?: string | null;
  onChoose: (choice: string) => void;
  onImagePainted?: () => void;
}

/**
 * The puzzle is one pre-rendered raster (the same image the AI receives); a transparent grid of
 * full-cell buttons sits on top of it so every pixel of the board is tappable.
 */
export function GameBoard({ gridSize, imageUrl, disabled, selected, loadingLabel, onChoose, onImagePainted }: GameBoardProps) {
  const cells = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize) + 1;
    const column = (index % gridSize) + 1;
    return { id: `r${row}c${column}`, row, column };
  });

  return (
    <div className={`board size-${gridSize}`} data-testid="board">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the raster must be served byte-identical to the AI input
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          decoding="sync"
          onLoad={() => requestAnimationFrame(() => requestAnimationFrame(() => onImagePainted?.()))}
        />
      ) : null}
      {!imageUrl && loadingLabel ? <div className="board-loading">{loadingLabel}</div> : null}
      {imageUrl ? (
        <div
          className="grid"
          role="group"
          aria-label="点击不同项"
          style={{
            inset: `${BOARD_INSET_PERCENT}%`,
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {cells.map((cell) => (
            <button
              key={cell.id}
              type="button"
              className={selected === cell.id ? "cell selected" : "cell"}
              aria-label={`第 ${cell.row} 行第 ${cell.column} 列`}
              aria-pressed={selected === cell.id}
              disabled={disabled}
              onPointerDown={(event) => {
                if (event.pointerType !== "mouse" && !disabled) {
                  event.preventDefault();
                  onChoose(cell.id);
                }
              }}
              onClick={() => {
                if (!disabled) onChoose(cell.id);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
