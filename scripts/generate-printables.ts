/**
 * Static PDF downloads for the printable sheets that declare `pdf` (src/content/printables.ts): one puzzle sheet and
 * one answer-key sheet each, US Letter. Same seeded puzzles as the /printable page.
 *
 *   npx tsx scripts/generate-printables.ts      (or: npm run printables:generate)
 *
 * Writes public/printables/*.pdf and src/content/printables.generated.json (the answer key per PDF). A unit test
 * compares that JSON with the live puzzles, so the committed PDFs can never drift from the web sheet.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { answerLines, cellName, sheetPuzzles, SHEETS, type SheetSpec } from "../src/content/printables";
import type { Sprite } from "../src/games/spot-the-difference/quick/sprites";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = "spotthedifferencegame.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function spriteSvg(sprite: Sprite): string {
  const rects: string[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (row[x + w] === c) w++;
      if (c !== ".") rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${sprite.palette[c] ?? "#000"}"/>`);
      x += w;
    }
  });
  return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

function grids(sheet: SheetSpec, answers: boolean): string {
  return sheetPuzzles(sheet)
    .map((p, i) => {
      const cells = Array.from({ length: p.grid ** 2 }, (_, c) => {
        const odd = c === p.oddIndex;
        return `<span class="cell${answers && odd ? " hit" : ""}">${spriteSvg(odd ? p.odd : p.base)}</span>`;
      }).join("");
      const caption = answers ? `Puzzle ${i + 1} · answer: ${cellName(p.oddIndex, p.grid)}` : `Puzzle ${i + 1} · ${p.grid}×${p.grid} · ${esc(p.base.name)}`;
      return `<figure><div class="grid" style="grid-template-columns:repeat(${p.grid},1fr)">${cells}</div><figcaption>${caption}</figcaption></figure>`;
    })
    .join("");
}

const heading = (sheet: SheetSpec) => (sheet.id === "christmas" ? sheet.title : `${sheet.toc} Spot the Difference Printable`);

function html(sheet: SheetSpec, answers: boolean): string {
  const lines = answerLines(sheet);
  return `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><title>${esc(heading(sheet))}${answers ? " – Answer Key" : ""}</title><style>
  @page { size: Letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1d2440; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  .sub { font-size: 11pt; margin: 0 0 12pt; }
  .puzzles { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt 20pt; max-width: 5.8in; margin: 0 auto; }
  figure { margin: 0; }
  .grid { display: grid; gap: 2pt; aspect-ratio: 1; border: 1.5pt solid #1d2440; padding: 3pt; }
  .cell { display: grid; place-items: center; border: 0.75pt solid #c8cfdd; padding: 8%; aspect-ratio: 1; }
  .cell svg { width: 100%; height: 100%; }
  .cell.hit { outline: 3pt solid #e5403a; outline-offset: -1pt; border-radius: 50%; }
  figcaption { font-size: 9.5pt; margin-top: 3pt; }
  .key { margin-top: 14pt; font-size: 11pt; }
  .key h2 { font-size: 13pt; margin: 0 0 4pt; }
  .key ol { margin: 0; padding-left: 18pt; }
  footer { margin-top: 12pt; font-size: 9pt; color: #5f574f; }
  </style></head><body>
  <h1>${esc(heading(sheet))}${answers ? " – Answer Key" : ""}</h1>
  <p class="sub">${answers ? "The odd picture in each grid is circled. Rows count from the top, columns from the left." : "In each grid, one picture is different from all the others. Circle it! Name: ______________________"}</p>
  <div class="puzzles">${grids(sheet, answers)}</div>
  ${answers ? `<section class="key"><h2>Answer key</h2><ol>${lines.map((l) => `<li>${esc(l.replace(/^Puzzle \d+: /, ""))}</li>`).join("")}</ol></section>` : ""}
  <footer>Free printable from ${SITE}/printable · Play it online against the AI at ${SITE}</footer>
  </body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(path.join(ROOT, "public/printables"), { recursive: true });
const manifest: Record<string, string[]> = {};
for (const sheet of SHEETS.filter((s) => s.pdf)) {
  for (const answers of [false, true]) {
    const url = answers ? sheet.pdf!.answers : sheet.pdf!.sheet;
    await page.setContent(html(sheet, answers), { waitUntil: "load" });
    const pdf = await page.pdf({ format: "Letter", printBackground: true, preferCSSPageSize: true, tagged: true });
    writeFileSync(path.join(ROOT, "public", url), pdf);
    manifest[url] = answerLines(sheet);
    console.log(`${url}  ${(pdf.length / 1024).toFixed(1)} KiB`);
  }
}
await browser.close();
writeFileSync(path.join(ROOT, "src/content/printables.generated.json"), `${JSON.stringify(manifest, null, 2)}\n`);
