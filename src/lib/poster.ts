import QRCode from "qrcode";
import { pad2 } from "./format";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Noto Sans CJK SC", "Helvetica Neue", Arial, sans-serif';

type Segment = { text: string; underline?: boolean };

export function posterHeadline(result: { reachedLevel: number; fasterThanAiCount: number; cleared: boolean }): Segment[][] {
  if (result.cleared) return [[{ text: "我通关了" }], [{ text: "HUMAN / AI" }]];
  if (result.fasterThanAiCount > 0) {
    return [[{ text: "我有 " }, { text: String(result.fasterThanAiCount), underline: true }, { text: " 关" }], [{ text: "比 AI 更快" }]];
  }
  return [[{ text: "我到达了" }], [{ text: "第 " }, { text: String(result.reachedLevel), underline: true }, { text: " 关" }]];
}

function drawQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const count = qr.modules.size + quiet * 2;
  const cell = Math.floor(size / count);
  const actual = cell * count;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, actual, actual);
  ctx.fillStyle = "#111111";
  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let col = 0; col < qr.modules.size; col += 1) {
      if (qr.modules.data[row * qr.modules.size + col]) ctx.fillRect(x + (col + quiet) * cell, y + (row + quiet) * cell, cell, cell);
    }
  }
  return actual;
}

/** Draws the approved 9:16 poster: brand, headline, reached level, challenge copy, short link and QR. */
export async function renderPoster(input: { reachedLevel: number; fasterThanAiCount: number; cleared: boolean; url: string; shortUrl: string }) {
  if (typeof document !== "undefined" && document.fonts) await document.fonts.ready.catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  const pad = 96;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#111111";
  ctx.font = `800 34px ${FONT}`;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("HUMAN / AI", pad, pad + 34);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  ctx.fillStyle = "#777777";
  ctx.font = `600 34px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("20 关挑战", POSTER_WIDTH - pad, pad + 34);
  ctx.textAlign = "left";

  const lines = posterHeadline(input);
  const headlineSize = 150;
  const lineHeight = headlineSize * 1.08;
  let y = 760;
  ctx.fillStyle = "#111111";
  ctx.font = `800 ${headlineSize}px ${FONT}`;
  for (const line of lines) {
    let x = pad;
    for (const segment of line) {
      ctx.fillText(segment.text, x, y);
      const width = ctx.measureText(segment.text).width;
      if (segment.underline) ctx.fillRect(x, y + 22, width, 9);
      x += width;
    }
    y += lineHeight;
  }

  ctx.fillStyle = "#777777";
  ctx.font = `600 46px ${FONT}`;
  ctx.fillText(`最终到达第 ${pad2(input.reachedLevel)} 关`, pad, y + 40);

  ctx.fillStyle = "#EEEEEA";
  ctx.fillRect(pad, 1440, POSTER_WIDTH - pad * 2, 2);

  const qrSize = 280;
  const qrX = POSTER_WIDTH - pad - qrSize + 16;
  const qrY = 1500;
  drawQr(ctx, input.url, qrX, qrY, qrSize);

  ctx.fillStyle = "#111111";
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText("同样的 20 关，", pad, 1560);
  ctx.fillText("你能走到哪里？", pad, 1630);
  ctx.fillStyle = "#777777";
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText(input.shortUrl, pad, POSTER_HEIGHT - pad, POSTER_WIDTH - pad * 2);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("poster_failed"))), "image/png"));
}
