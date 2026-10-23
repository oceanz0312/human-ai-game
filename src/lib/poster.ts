import { FALLBACK_MESSAGE_LOCALE } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { POSTER_PALETTE } from "./pixel-palette";
import { drawPixelColorQr, drawPixelHeroScanZone, drawPixelQrFrame } from "./poster-pixel-qr";
import { posterOutcomeLine, posterScanHook, shareCopy, shareOutcome, type ShareOutcome, type ShareStats } from "./share-copy";

export { posterHeadline } from "./share-copy";
export { POSTER_PALETTE } from "./pixel-palette";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;
/** Hero QR in the scan zone (was 240px in the original footer strip). */
export const POSTER_HERO_QR_PX = 784;
/** @deprecated Renamed — use POSTER_HERO_QR_PX. */
export const POSTER_FOOTER_QR_PX = POSTER_HERO_QR_PX;

const P = POSTER_PALETTE;
const QR_FRAME = 14;

const BADGE_FILL: Record<ShareOutcome, string> = { cleared: P.hi, win: P.ok, tie: P.hi, loss: P.ai };

const SYSTEM_CJK = '"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';

/** Resolve the next/font family names exposed on <html> as CSS variables (see src/lib/fonts.ts). */
function fontFamilies() {
  const read = (name: string) =>
    typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const fusion = read("--font-fusion-pixel");
  const press = read("--font-press-start");
  const cjk = [fusion, SYSTEM_CJK].filter(Boolean).join(", ");
  const latin = [press, fusion, "monospace"].filter(Boolean).join(", ");
  return { cjk, latin };
}

async function loadFonts(families: { cjk: string; latin: string }, text: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`48px ${families.cjk}`, text).catch(() => undefined),
    document.fonts.load(`48px ${families.latin}`, "HUMANVSAI0123456789%/-").catch(() => undefined),
  ]);
  await document.fonts.ready.catch(() => undefined);
}

/** Pixel box: flat fill, solid ink border, hard offset shadow, no radius. */
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border = 12, shadow = 18) {
  if (shadow) {
    ctx.fillStyle = P.ink;
    ctx.fillRect(x + shadow, y + shadow, w, h);
  }
  ctx.fillStyle = P.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + border, y + border, w - border * 2, h - border * 2);
}

/** Largest size from the pixel grid list that fits maxWidth. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, sizes: number[], maxWidth: number) {
  for (const size of sizes) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  const last = sizes[sizes.length - 1];
  ctx.font = `${last}px ${family}`;
  return last;
}

export type PosterInput = ShareStats & { url: string; shortUrl: string; locale?: Locale };

/** Draws the 9:16 pixel-style result poster: minimal outcome + hero scan zone (color QR + hook). */
export async function renderPoster(input: PosterInput) {
  const locale = input.locale ?? FALLBACK_MESSAGE_LOCALE;
  const zh = locale === "zh";
  const c = shareCopy(locale);
  const outcome = shareOutcome(input);
  const outcomeLine = posterOutcomeLine(input, locale);
  const scanHook = posterScanHook();

  const families = fontFamilies();
  const display = zh ? families.cjk : families.latin;
  const badge = c.badge[outcome];
  await loadFonts(families, [outcomeLine, scanHook, badge].join(""));

  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  const W = POSTER_WIDTH;
  const pad = 72;
  const inner = W - pad * 2;

  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, POSTER_HEIGHT);
  ctx.fillStyle = P.gridDot;
  for (let gy = 12; gy < POSTER_HEIGHT; gy += 24) for (let gx = 12; gx < W; gx += 24) ctx.fillRect(gx, gy, 3, 3);
  ctx.textBaseline = "middle";

  ctx.font = zh ? `44px ${families.cjk}` : `36px ${families.latin}`;
  const badgeW = Math.ceil(ctx.measureText(badge).width) + 48;
  box(ctx, W - pad - badgeW, pad, badgeW, 72, BADGE_FILL[outcome], 8, 12);
  ctx.fillStyle = P.ink;
  ctx.fillText(badge, W - pad - badgeW + 24, pad + 38);

  const hlSizes = zh ? [72, 64, 56] : [56, 48, 40];
  const hs = fit(ctx, outcomeLine, display, hlSizes, inner - 24);
  ctx.font = `${hs}px ${display}`;
  const lineW = Math.ceil(ctx.measureText(outcomeLine).width);
  const lineY = 248;
  ctx.fillStyle = P.hi;
  ctx.fillRect(pad - 8, lineY - hs / 2 - 20, lineW + 32, hs + 40);
  ctx.fillStyle = P.ink;
  ctx.fillText(outcomeLine, pad + 8, lineY + (zh ? 0 : 2));

  const scanY = 380;
  const scanH = POSTER_HEIGHT - pad - scanY;
  const scanW = inner - 18;
  drawPixelHeroScanZone(ctx, pad, scanY, scanW, scanH);

  const qr = POSTER_HERO_QR_PX;
  const qrBlock = qr + QR_FRAME * 2;
  const qrX = pad + Math.floor((scanW - qrBlock) / 2);
  const hookSize = fit(ctx, scanHook, families.latin, [40, 36, 32], scanW - 96);
  ctx.font = `${hookSize}px ${families.latin}`;
  const hookH = hookSize + 48;
  const stackH = qrBlock + hookH;
  const stackTop = scanY + Math.floor((scanH - stackH) / 2);
  const qrY = stackTop;
  drawPixelQrFrame(ctx, qrX + QR_FRAME, qrY + QR_FRAME, qr, QR_FRAME);
  drawPixelColorQr(ctx, input.url, qrX + QR_FRAME, qrY + QR_FRAME, qr);

  ctx.fillStyle = P.ink;
  ctx.textAlign = "center";
  ctx.fillText(scanHook, pad + scanW / 2, qrY + qrBlock + hookH / 2);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("poster_failed"))), "image/png"));
}
