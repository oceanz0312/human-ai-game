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
