import { makePuzzle } from "./puzzle";
import type { QuickTheme } from "./sprites";
import { SpriteDefs, SpriteUse } from "./PixelSprite";

export interface SheetSpec {
  id: string;
  title: string;
  theme: QuickTheme;
  grids: number[];
  changes: number;
}

const cellName = (index: number, grid: number) => `row ${Math.floor(index / grid) + 1}, column ${(index % grid) + 1}`;

/** One printable sheet: N numbered puzzles + an answer key. Pure SVG, prints crisp at any size. */
export function PrintSheet({ sheet }: { sheet: SheetSpec }) {
  const puzzles = sheet.grids.map((grid, i) => makePuzzle(`print-${sheet.id}-${i}`, { theme: sheet.theme, grid, changes: sheet.changes }));
  return (
    <article className="print-sheet" data-testid="print-sheet" aria-labelledby={`${sheet.id}-title`}>
      <h2 id={`${sheet.id}-title`}>{sheet.title}</h2>
      <p className="print-instructions">In each grid, one picture is different from all the others. Circle it! Name: ____________</p>
      <div className="print-puzzles">
        {puzzles.map((puzzle, i) => {
          const prefix = `p-${sheet.id}-${i}`;
          return (
            <figure key={prefix} className="print-puzzle">
              <SpriteDefs prefix={prefix} sprites={[puzzle.base, puzzle.odd]} />
              <div className="print-grid" style={{ gridTemplateColumns: `repeat(${puzzle.grid}, 1fr)` }}>
                {Array.from({ length: puzzle.grid ** 2 }, (_, cell) => (
                  <span key={cell} className="print-cell">
                    <SpriteUse href={`${prefix}-${cell === puzzle.oddIndex ? puzzle.odd.id : puzzle.base.id}`} />
                  </span>
                ))}
              </div>
              <figcaption>
                Puzzle {i + 1} · {puzzle.grid}×{puzzle.grid} · {puzzle.base.name}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <section className="print-answers" data-testid="answer-key">
        <h3>Answer key</h3>
        <ol>
          {puzzles.map((puzzle, i) => (
            <li key={i}>
              Puzzle {i + 1}: {cellName(puzzle.oddIndex, puzzle.grid)} ({puzzle.changed.length} {puzzle.changed.length === 1 ? "pixel" : "pixels"} changed)
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
