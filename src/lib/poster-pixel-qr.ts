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

const BRAND_TILES = [P.human, P.hi, P.ai, P.ok] as const;

/** Full hero scan panel: checker tiles, brand speckle, chunky ink frame (not a flat black slab). */
export function drawPixelHeroScanZone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const shadow = 18;
  ctx.fillStyle = P.ink;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  ctx.fillRect(x, y, w, h);

  const inset = 16;
  const ix = x + inset;
  const iy = y + inset;
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  const tile = 24;

  for (let ty = 0; ty < ih; ty += tile) {
    for (let tx = 0; tx < iw; tx += tile) {
      const tw = Math.min(tile, iw - tx);
      const th = Math.min(tile, ih - ty);
      const gx = Math.floor((ix + tx) / tile);
      const gy = Math.floor((iy + ty) / tile);
      let fill = (gx + gy) % 2 === 0 ? P.paper : P.gridDot;
      if ((gx * 5 + gy * 13) % 17 === 0) fill = BRAND_TILES[(gx + gy) % BRAND_TILES.length];
      ctx.fillStyle = fill;
      ctx.fillRect(ix + tx, iy + ty, tw, th);
    }
  }

  const stripe = 12;
  for (let i = 0; i < iw; i += stripe) {
    ctx.fillStyle = BRAND_TILES[Math.floor(i / stripe) % BRAND_TILES.length];
    ctx.fillRect(ix + i, iy, Math.min(stripe, iw - i), stripe);
    ctx.fillRect(ix + i, iy + ih - stripe, Math.min(stripe, iw - i), stripe);
  }

  const corner = 48;
  BRAND_TILES.forEach((fill, i) => {
    const cx = i % 2 === 0 ? ix : ix + iw - corner;
    const cy = i < 2 ? iy + stripe : iy + ih - stripe - corner;
    ctx.fillStyle = P.ink;
    ctx.fillRect(cx - 4, cy - 4, corner + 8, corner + 8);
    ctx.fillStyle = fill;
    ctx.fillRect(cx, cy, corner, corner);
  });

  const rim = 8;
  ctx.fillStyle = P.ink;
  ctx.fillRect(ix, iy, iw, rim);
  ctx.fillRect(ix, iy + ih - rim, iw, rim);
  ctx.fillRect(ix, iy, rim, ih);
  ctx.fillRect(ix + iw - rim, iy, rim, ih);
  ctx.fillStyle = P.surface;
  ctx.fillRect(ix + rim, iy + rim, iw - rim * 2, rim - 4);
  ctx.fillRect(ix + rim, iy + ih - rim * 2, iw - rim * 2, rim - 4);
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
