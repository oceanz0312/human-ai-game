import QRCode from "qrcode";
import { POSTER_PALETTE } from "./pixel-palette";

const P = POSTER_PALETTE;

/** Dark module fills (high contrast on paper; keeps phone scanners happy). */
const MODULE_FILLS = [P.ink, P.humanText, P.aiText, "#127029"] as const;

function inCornerFinder(row: number, col: number, n: number) {
  if (row < 7 && col < 7) return "tl";
  if (row < 7 && col >= n - 7) return "tr";
  if (row >= n - 7 && col < 7) return "bl";
  return null;
}

function finderFill(dark: boolean) {
  return dark ? P.ink : P.paper;
}

function isTiming(row: number, col: number, n: number) {
  return row === 6 || col === 6;
}

function dataModuleFill(row: number, col: number) {
  return MODULE_FILLS[(row * 5 + col * 3) % MODULE_FILLS.length];
}

/** Pixel-art QR: paper quiet zone, ink timing/finders, colorful data modules with ink pixel rim. */
export function drawPixelColorQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const quiet = 4;
  const n = qr.modules.size;
  const count = n + quiet * 2;
  const cell = Math.floor(size / count);
  const actual = cell * count;
  const ox = x + Math.floor((size - actual) / 2);
  const oy = y + Math.floor((size - actual) / 2);

  ctx.fillStyle = P.paper;
  ctx.fillRect(x, y, size, size);

  const rim = Math.max(2, Math.floor(cell * 0.18));

  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const dark = qr.modules.data[row * n + col];
      const px = ox + (col + quiet) * cell;
      const py = oy + (row + quiet) * cell;
      const corner = inCornerFinder(row, col, n);
      if (corner) {
        ctx.fillStyle = finderFill(dark);
        ctx.fillRect(px, py, cell, cell);
        continue;
      }
      if (!dark) continue;
      if (isTiming(row, col, n)) {
        ctx.fillStyle = P.ink;
        ctx.fillRect(px, py, cell, cell);
        continue;
      }
      ctx.fillStyle = P.ink;
      ctx.fillRect(px, py, cell, cell);
      ctx.fillStyle = dataModuleFill(row, col);
      ctx.fillRect(px + rim, py + rim, cell - rim * 2, cell - rim * 2);
    }
  }
}

/** 8-bit frame: alternating brand squares around the QR bounds. */
export function drawPixelQrFrame(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, frame: number) {
  const colors = [P.human, P.hi, P.ai, P.ok];
  const outer = size + frame * 2;
  ctx.fillStyle = P.ink;
  ctx.fillRect(x - frame, y - frame, outer, outer);
  for (let i = 0; i < outer; i += frame) {
    ctx.fillStyle = colors[Math.floor(i / frame) % colors.length];
    ctx.fillRect(x - frame, y - frame + i, frame, frame);
    ctx.fillRect(x + size, y - frame + i, frame, frame);
    ctx.fillRect(x - frame + i, y - frame, frame, frame);
    ctx.fillRect(x - frame + i, y + size, frame, frame);
  }
}
