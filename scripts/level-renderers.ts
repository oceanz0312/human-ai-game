import type { GridSize } from "../src/game/contracts";
import { LEVEL_IMAGE_MARGIN, LEVEL_IMAGE_SIZE, TILE_GAP, TILE_RADIUS } from "../src/game/board";
import type { LevelSpec } from "../src/server/levels/spec";

const INK = "#111111";
const TILE = "#FFFFFF";
const SURFACE = "#F4F4F1";
const NOISE_PALETTE = ["#111111", "#2B6CFF", "#E07A00", "#2F8F5B"];

/** Glyphs are drawn in a unit box of [-1, 1]; `unit` returns markup in that space. */
type Glyph = (cellIndex: number) => { body: string; rotate?: number; mirror?: boolean };

const line = (x1: number, y1: number, x2: number, y2: number, width: number, color = INK) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

const circle = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

function arcRing(gapCenterDeg: number, gapHalfDeg: number, radius: number, width: number, color: string) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const start = toRad(gapCenterDeg + gapHalfDeg);
  const end = toRad(gapCenterDeg - gapHalfDeg + 360);
  const p = (angle: number) => `${(radius * Math.cos(angle)).toFixed(4)} ${(radius * Math.sin(angle)).toFixed(4)}`;
  return `<path d="M ${p(start)} A ${radius} ${radius} 0 1 1 ${p(end)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="butt"/>`;
}

const smile = () => ({
  body:
    circle(0, 0, 0.86, "#FFC83D") +
    circle(-0.3, -0.2, 0.1, INK) +
    circle(0.3, -0.2, 0.1, INK) +
    `<path d="M -0.38 0.18 Q 0 0.58 0.38 0.18" fill="none" stroke="${INK}" stroke-width="0.1" stroke-linecap="round"/>`,
});

const heart = () => ({
  body: `<path d="M 0 0.8 C -1 0.15 -0.95 -0.62 -0.45 -0.68 C -0.18 -0.7 0 -0.45 0 -0.28 C 0 -0.45 0.18 -0.7 0.45 -0.68 C 0.95 -0.62 1 0.15 0 0.8 Z" fill="#FF5A5F"/>`,
});

const dot = (color: string) => () => ({ body: circle(0, 0, 0.72, color) });

const arrow = (rotate: number) => () => ({
  rotate,
  body: line(-0.7, 0, 0.62, 0, 0.18) + `<polyline points="0.2,-0.42 0.66,0 0.2,0.42" fill="none" stroke="${INK}" stroke-width="0.18" stroke-linecap="round" stroke-linejoin="round"/>`,
});

const face = (eyes: 1 | 2) => () => ({
  body:
    `<circle cx="0" cy="0" r="0.82" fill="none" stroke="${INK}" stroke-width="0.12"/>` +
    circle(-0.32, -0.2, 0.12, INK) +
    (eyes === 2 ? circle(0.32, -0.2, 0.12, INK) : "") +
    line(-0.32, 0.34, 0.32, 0.34, 0.12),
});

const ellipseRing = (rx: number) => () => ({
  body: `<ellipse cx="0" cy="0" rx="${rx}" ry="0.8" fill="none" stroke="${INK}" stroke-width="0.17"/>`,
});

type Stroke = [number, number, number, number];
const strokes = (items: Stroke[], width = 0.14) => () => ({ body: items.map(([a, b, c, d]) => line(a, b, c, d, width)).join("") });

const WEI: Stroke[] = [[-0.45, -0.42, 0.45, -0.42], [-0.82, 0.0, 0.82, 0.0], [0, -0.88, 0, 0.9], [0, 0.04, -0.72, 0.72], [0, 0.04, 0.72, 0.72]];
const MO: Stroke[] = [[-0.82, -0.42, 0.82, -0.42], [-0.45, 0.0, 0.45, 0.0], [0, -0.88, 0, 0.9], [0, 0.04, -0.72, 0.72], [0, 0.04, 0.72, 0.72]];
const TU: Stroke[] = [[-0.45, -0.3, 0.45, -0.3], [0, -0.82, 0, 0.72], [-0.85, 0.72, 0.85, 0.72]];
const SHI: Stroke[] = [[-0.85, -0.3, 0.85, -0.3], [0, -0.82, 0, 0.72], [-0.45, 0.72, 0.45, 0.72]];

const shapeCircle = () => ({ body: circle(0, 0, 0.66, INK) });
const shapeDiamond = () => ({ body: `<polygon points="0,-0.8 0.8,0 0,0.8 -0.8,0" fill="${INK}"/>` });

const boxDot = (withDot: boolean) => () => ({
  body: `<rect x="-0.62" y="-0.62" width="1.24" height="1.24" rx="0.08" fill="none" stroke="${INK}" stroke-width="0.12"/>` + (withDot ? circle(0, 0, 0.2, INK) : ""),
});

const shade = (color: string) => () => ({ body: `<rect x="-0.68" y="-0.68" width="1.36" height="1.36" rx="0.22" fill="${color}"/>` });

const flag = (mirror: boolean) => () => ({
  mirror,
  body: line(-0.5, -0.82, -0.5, 0.86, 0.12) + `<polygon points="-0.5,-0.82 0.66,-0.46 -0.5,-0.1" fill="${INK}"/>`,
});

const ring = (gapCenterDeg: number, gapHalfDeg: number, color: string, width: number) => () => ({
  body: arcRing(gapCenterDeg, gapHalfDeg, 0.6, width, color),
});

const doubleLine = (rotate: number) => (cellIndex: number) => {
  const color = NOISE_PALETTE[(cellIndex * 7 + Math.floor(cellIndex / 9)) % NOISE_PALETTE.length];
  return { rotate, body: line(-0.68, -0.26, 0.68, -0.26, 0.17, color) + line(-0.68, 0.26, 0.68, 0.26, 0.17, color) };
};

const hole = (x: number) => () => ({ body: circle(0, 0, 0.74, INK) + circle(x, 0, 0.22, TILE) });

const nodes = (count: 2 | 3) => () => ({
  body:
    `<rect x="-0.74" y="-0.74" width="1.48" height="1.48" rx="0.24" fill="none" stroke="${INK}" stroke-width="0.1"/>` +
    line(-0.36, -0.3, 0.36, -0.3, 0.07) +
    line(-0.36, -0.3, 0, 0.36, 0.07) +
    line(0.36, -0.3, 0, 0.36, 0.07) +
    circle(-0.36, -0.3, 0.14, INK) +
    circle(0.36, -0.3, 0.14, INK) +
    (count === 3 ? circle(0, 0.36, 0.14, INK) : ""),
});

const hook = (mirror: boolean) => () => ({
  mirror,
  body: `<path d="M 0.28 -0.78 L 0.28 0.28 Q 0.28 0.72 -0.14 0.72 Q -0.46 0.72 -0.52 0.4" fill="none" stroke="#B4B4B0" stroke-width="0.17" stroke-linecap="round"/>`,
});

const quadSquares = (shift: number) => () => ({
  body: [
    [-0.4, -0.4, 0],
    [0.4, -0.4, 0],
    [-0.4, 0.4, 0],
    [0.4, 0.4, shift],
  ]
    .map(([x, y, s]) => `<rect x="${x - 0.2 + s}" y="${y - 0.2 + s}" width="0.4" height="0.4" rx="0.06" fill="${INK}"/>`)
    .join(""),
});

const plusBars = (shiftRight: number) => () => ({
  body:
    line(0, -0.72, 0, -0.26, 0.14) +
    line(0, 0.26, 0, 0.72, 0.14) +
    line(-0.72, 0, -0.26, 0, 0.14) +
    line(0.26, shiftRight, 0.72, shiftRight, 0.14),
});

const GLYPHS: Record<number, { normal: Glyph; odd: Glyph }> = {
  1: { normal: smile, odd: heart },
  2: { normal: dot("#2B6CFF"), odd: dot("#FF8A00") },
  3: { normal: arrow(0), odd: arrow(180) },
  4: { normal: face(2), odd: face(1) },
  5: { normal: ellipseRing(0.74), odd: ellipseRing(0.46) },
  6: { normal: shapeCircle, odd: shapeDiamond },
  7: { normal: arrow(-90), odd: arrow(-72) },
  8: { normal: strokes(WEI), odd: strokes(MO) },
  9: { normal: boxDot(true), odd: boxDot(false) },
  10: { normal: shade("#3C3C3C"), odd: shade("#5A5A5A") },
  11: { normal: flag(false), odd: flag(true) },
  12: { normal: ring(-90, 28, INK, 0.2), odd: ring(0, 28, INK, 0.2) },
  13: { normal: doubleLine(0), odd: doubleLine(12) },
  14: { normal: hole(-0.32), odd: hole(0.32) },
  15: { normal: nodes(3), odd: nodes(2) },
  16: { normal: strokes(TU), odd: strokes(SHI) },
  17: { normal: hook(false), odd: hook(true) },
  18: { normal: quadSquares(0), odd: quadSquares(0.16) },
  19: { normal: ring(90, 13, "#A8A8A4", 0.16), odd: ring(180, 13, "#A8A8A4", 0.16) },
  20: { normal: plusBars(0), odd: plusBars(0.09) },
};

export function renderLevelSvg(level: LevelSpec): string {
  const glyphs = GLYPHS[level.level];
  if (!glyphs) throw new Error(`No renderer for level ${level.level}`);
  const n: GridSize = level.gridSize;
  const inner = LEVEL_IMAGE_SIZE - LEVEL_IMAGE_MARGIN * 2;
  const pitch = inner / n;
  const gap = TILE_GAP[n];
  const tile = pitch - gap;
  const scale = tile * 0.36;
  const cells: string[] = [];

  level.choices.forEach((choice, index) => {
    const row = Math.floor(index / n);
    const col = index % n;
    const x = LEVEL_IMAGE_MARGIN + col * pitch + gap / 2;
    const y = LEVEL_IMAGE_MARGIN + row * pitch + gap / 2;
    const cx = x + tile / 2;
    const cy = y + tile / 2;
    const glyph = (choice === level.correctChoice ? glyphs.odd : glyphs.normal)(index);
    const mirror = glyph.mirror ? " scale(-1 1)" : "";
    cells.push(
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tile.toFixed(2)}" height="${tile.toFixed(2)}" rx="${TILE_RADIUS[n]}" fill="${TILE}"/>` +
        `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${glyph.rotate ?? 0}) scale(${scale.toFixed(3)})${mirror}">${glyph.body}</g>`,
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEVEL_IMAGE_SIZE}" height="${LEVEL_IMAGE_SIZE}" viewBox="0 0 ${LEVEL_IMAGE_SIZE} ${LEVEL_IMAGE_SIZE}"><rect width="100%" height="100%" fill="${SURFACE}"/>${cells.join("")}</svg>`;
}
