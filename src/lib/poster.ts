import { FALLBACK_MESSAGE_LOCALE } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { POSTER_PALETTE } from "./pixel-palette";
import { drawPixelColorQr, drawPixelQrFrame } from "./poster-pixel-qr";
import { posterHeadline, posterScanHook, shareCopy, shareOutcome, type ShareOutcome, type ShareStats } from "./share-copy";

export { posterHeadline } from "./share-copy";
export { POSTER_PALETTE } from "./pixel-palette";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;
/** Hero QR in the scan zone (was 240px in the original footer strip). */
export const POSTER_HERO_QR_PX = 752;
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
  const [line1, line2] = posterHeadline(input, locale);

  const families = fontFamilies();
  const display = zh ? families.cjk : families.latin;
  const scanHook = posterScanHook();
  await loadFonts(families, [line1, line2, scanHook, c.badge[outcome]].join(""));

  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  const W = POSTER_WIDTH;
  const pad = 72;
  const inner = W - pad * 2;

  // paper + dot grid
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, W, POSTER_HEIGHT);
  ctx.fillStyle = P.gridDot;
  for (let gy = 12; gy < POSTER_HEIGHT; gy += 24) for (let gx = 12; gx < W; gx += 24) ctx.fillRect(gx, gy, 3, 3);
  ctx.textBaseline = "middle";

  const badge = c.badge[outcome];
  ctx.font = zh ? `44px ${families.cjk}` : `36px ${families.latin}`;
  const badgeW = Math.ceil(ctx.measureText(badge).width) + 52;

  // brand bar: title + pixel swatches + outcome badge (no separate game tag row)
  const barH = 96;
  box(ctx, pad, pad, inner - 18, barH, P.ink, 0, 18);
  ctx.fillStyle = P.surface;
  ctx.font = `28px ${families.latin}`;
  ctx.fillText("Spot The Difference", pad + 28, pad + 50);
  [P.human, P.hi, P.ai].forEach((fill, i) => {
    const s = 28;
    const bx = pad + inner - 18 - badgeW - 48 - (3 - i) * (s + 8);
    ctx.fillStyle = fill;
    ctx.fillRect(bx, pad + 34, s, s);
  });
  box(ctx, W - pad - 12 - badgeW, pad + 8, badgeW, barH - 16, BADGE_FILL[outcome], 8, 0);
  ctx.fillStyle = P.ink;
  ctx.fillText(badge, W - pad - 12 - badgeW + 26, pad + 50);

  // outcome headline only (no accuracy card, no stat tiles)
  const hlSizes = zh ? [96, 84, 72] : [72, 64, 56];
  const size1 = fit(ctx, line1, display, hlSizes, inner);
  const size2 = fit(ctx, line2, display, hlSizes, inner - 40);
  const hs = Math.min(size1, size2);
  ctx.font = `${hs}px ${display}`;
  ctx.fillStyle = P.ink;
  const h1y = 280;
  ctx.fillText(line1, pad, h1y);
  const l2w = Math.ceil(ctx.measureText(line2).width);
  const h2y = h1y + hs + 56;
  ctx.fillStyle = P.hi;
  ctx.fillRect(pad - 12, h2y - hs / 2 - 24, l2w + 48, hs + 48);
  ctx.fillStyle = P.ink;
  ctx.fillText(line2, pad + 12, h2y + (zh ? 0 : 4));

  // hero scan zone: dominates the lower canvas
  const scanY = 520;
  const scanH = POSTER_HEIGHT - pad - scanY;
  const scanW = inner - 18;
  box(ctx, pad, scanY, scanW, scanH, P.ink, 0, 18);

  const hookSize = fit(ctx, scanHook, families.latin, [48, 42, 36], scanW - 80);
  ctx.font = `${hookSize}px ${families.latin}`;
  ctx.fillStyle = P.surface;
  ctx.textAlign = "center";
  ctx.fillText(scanHook, pad + scanW / 2, scanY + 64);

  const qr = POSTER_HERO_QR_PX;
  const qrBlock = qr + QR_FRAME * 2;
  const qrX = pad + Math.floor((scanW - qrBlock) / 2);
  const zoneTop = scanY + 108;
  const zoneBottom = scanY + scanH - 40;
  const qrY = zoneTop + Math.floor((zoneBottom - zoneTop - qrBlock) / 2);
  drawPixelQrFrame(ctx, qrX + QR_FRAME, qrY + QR_FRAME, qr, QR_FRAME);
  drawPixelColorQr(ctx, input.url, qrX + QR_FRAME, qrY + QR_FRAME, qr);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("poster_failed"))), "image/png"));
}
