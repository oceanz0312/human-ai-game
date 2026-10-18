import { KeywordPage } from "@/components/site/KeywordPage";
import { KEYWORD_PAGES } from "@/content/keyword-pages";
import { CHRISTMAS, EVERYDAY } from "@/games/spot-the-difference/quick/sprites";
import { makePuzzle } from "@/games/spot-the-difference/quick/puzzle";
import { PixelSprite } from "@/games/spot-the-difference/quick/PixelSprite";
import { keywordMetadata } from "../keyword-route";

const PATH = "/pictures";
export const generateMetadata = () => keywordMetadata(PATH);

/** Gallery: every sprite next to one changed copy (the actual building blocks of the puzzles). */
export default function Page() {
  const all = [...EVERYDAY, ...CHRISTMAS];
  return (
    <KeywordPage page={KEYWORD_PAGES[PATH]}>
      <section>
        <h2>Picture gallery</h2>
        <p>Left: the picture as it appears in most cells. Right: an example odd copy with two pixels changed. Can you spot both differences?</p>
        <ul className="sprite-gallery" data-testid="sprite-gallery">
          {all.map((sprite, i) => {
            const puzzle = makePuzzle(`gallery-${sprite.id}`, { theme: i < EVERYDAY.length ? "everyday" : "christmas", grid: 2, changes: 2 });
            const changed = { ...sprite, id: `${sprite.id}-g`, rows: applyChanges(sprite.rows, puzzle.changed, sprite) };
            return (
              <li key={sprite.id} className="card sprite-pair">
                <PixelSprite sprite={sprite} title={sprite.name} />
                <PixelSprite sprite={changed} title={`${sprite.name}, changed copy`} />
                <span>{sprite.name}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </KeywordPage>
  );
}

function applyChanges(rows: string[], changed: { x: number; y: number }[], sprite: { palette: Record<string, string> }) {
  const grid = rows.map((row) => row.split(""));
  const colours = Object.keys(sprite.palette);
  for (const { x, y } of changed) {
    const current = grid[y][x];
    grid[y][x] = current === "." ? colours[0] : colours.find((c) => c !== current) ?? ".";
  }
  return grid.map((row) => row.join(""));
}
