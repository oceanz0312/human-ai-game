import { generateQR } from "modqr";
import { POSTER_PALETTE } from "./pixel-palette";

const P = POSTER_PALETTE;

/** Pixel QR via modqr (`style: "pixel"`), composited onto the poster canvas. */
export function drawPosterModqr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const qr = generateQR(url, {
    renderer: "canvas",
    style: "pixel",
    size,
    margin: 3,
    foreground: P.ink,
    background: P.surface,
    finderColor: P.humanText,
    errorCorrection: "M",
  });
  if (!qr.drawCanvas) throw new Error("modqr_canvas_unavailable");
  qr.drawCanvas(canvas);
  ctx.drawImage(canvas, x, y, size, size);
}

/** Ink pixel pad behind the QR (simple frame, no rainbow border). */
export function drawQrPixelPad(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, pad: number) {
  ctx.fillStyle = P.ink;
  ctx.fillRect(x - pad, y - pad, size + pad * 2, size + pad * 2);
  ctx.fillStyle = P.paper;
  ctx.fillRect(x - pad + 6, y - pad + 6, size + pad * 2 - 12, size + pad * 2 - 12);
}

/** Scan panel: surface + dot grid + thin brand top stripe (toned down vs full checker). */
export function drawPixelHeroScanZone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const shadow = 18;
  ctx.fillStyle = P.ink;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  ctx.fillRect(x, y, w, h);

  const inset = 12;
  const ix = x + inset;
  const iy = y + inset;
  const iw = w - inset * 2;
  const ih = h - inset * 2;

  ctx.fillStyle = P.surface;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = P.gridDot;
  for (let gy = iy + 12; gy < iy + ih; gy += 24) {
    for (let gx = ix + 12; gx < ix + iw; gx += 24) ctx.fillRect(gx, gy, 3, 3);
  }

  const stripe = 10;
  const seg = Math.floor(iw / 3);
  [P.human, P.hi, P.ai].forEach((fill, i) => {
    ctx.fillStyle = fill;
    ctx.fillRect(ix + i * seg, iy, i === 2 ? iw - seg * 2 : seg, stripe);
  });
  ctx.fillStyle = P.ink;
  ctx.fillRect(ix, iy + stripe, iw, 4);
}
