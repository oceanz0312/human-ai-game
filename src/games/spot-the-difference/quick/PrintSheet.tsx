import { answerLines, sheetPuzzles, type SheetSpec } from "@/content/printables";
import { SpriteDefs, SpriteUse } from "./PixelSprite";

export type { SheetSpec } from "@/content/printables";

/**
 * One printable sheet: N numbered puzzles + an answer key. Pure SVG, prints crisp at any size. `intro` (screen only,
 * hidden in print) sits between the heading and the puzzles.
 */
export function PrintSheet({ sheet, intro }: { sheet: SheetSpec; intro?: React.ReactNode }) {
  const puzzles = sheetPuzzles(sheet);
  const answers = answerLines(sheet);
  return (
    <article id={sheet.id} className="print-sheet" data-testid="print-sheet" aria-labelledby={`${sheet.id}-title`}>
      <h2 id={`${sheet.id}-title`}>{sheet.title}</h2>
      {intro ? <div className="print-intro" data-testid={`${sheet.id}-intro`}>{intro}</div> : null}
      {sheet.pdf ? (
        <p className="print-downloads" data-testid={`${sheet.id}-downloads`}>
          <a className="print-download" href={sheet.pdf.sheet} download>
            ⬇ Download PDF
          </a>
          <a className="print-download-answers" href={sheet.pdf.answers} download>
            Answer key (PDF)
          </a>
        </p>
      ) : null}
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
      <section className="print-answers" data-testid="answer-key" id={`${sheet.id}-answers`}>
        <h3>Answer key</h3>
        <ol>
          {answers.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}
