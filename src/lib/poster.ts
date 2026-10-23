import { FALLBACK_MESSAGE_LOCALE } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { POSTER_PALETTE } from "./pixel-palette";
import { drawPixelColorQr, drawPixelQrFrame } from "./poster-pixel-qr";
import { accuracy, posterHeadline, posterScanHook, posterStats, shareCopy, shareOutcome, type ShareOutcome, type ShareStats } from "./share-copy";

export { posterHeadline } from "./share-copy";
export { POSTER_PALETTE } from "./pixel-palette";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;
/** Hero QR in the scan zone (was 240px in the original footer strip). */
export const POSTER_HERO_QR_PX = 672;
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

/** 10-segment block bar, filled in proportion to pct. */
function segBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number | null, fill: string) {
  const segs = 10;
  const gap = 6;
  const seg = Math.floor((w - gap * (segs - 1)) / segs);
  const on = pct == null ? 0 : Math.round(pct / 10);
  for (let i = 0; i < segs; i += 1) {
    const sx = x + i * (seg + gap);
    ctx.fillStyle = P.ink;
    ctx.fillRect(sx, y, seg, h);
    ctx.fillStyle = i < on ? fill : P.paper;
    ctx.fillRect(sx + 3, y + 3, seg - 6, h - 6);
  }
}

export type PosterInput = ShareStats & { url: string; shortUrl: string; locale?: Locale };

/** Draws the 9:16 pixel-style result poster: result stack + hero scan zone (color QR + hook). */
export async function renderPoster(input: PosterInput) {
  const locale = input.locale ?? FALLBACK_MESSAGE_LOCALE;
  const zh = locale === "zh";
  const c = shareCopy(locale);
  const outcome = shareOutcome(input);
  const [line1, line2] = posterHeadline(input, locale);
  const stats = posterStats(input, locale);
  const human = accuracy(input.humanCorrect, input.played);
  const ai = accuracy(input.aiCorrect, input.played);

  const families = fontFamilies();
  const display = zh ? families.cjk : families.latin;
  const scanHook = posterScanHook();
  await loadFonts(families, [line1, line2, c.game, c.accuracy, c.you, c.reached, c.correct, c.faster, c.rounds, scanHook, c.badge[outcome]].join(""));

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

  // brand bar (window title bar)
  box(ctx, pad, pad, inner - 18, 108, P.ink, 0, 18);
  ctx.fillStyle = P.surface;
  ctx.font = `32px ${families.latin}`;
  ctx.fillText("Spot The Difference Game", pad + 32, pad + 58);
  [P.human, P.hi, P.ai].forEach((fill, i) => {
    const s = 32;
    const bx = pad + inner - 18 - 32 - (3 - i) * (s + 10) + 10;
    ctx.fillStyle = fill;
    ctx.fillRect(bx, pad + 38, s, s);
  });

  // game tag + outcome badge
  const tagY = 228;
  ctx.font = zh ? `32px ${families.cjk}` : `22px ${families.latin}`;
  const tagW = Math.ceil(ctx.measureText(c.game).width) + 44;
  box(ctx, pad, tagY, tagW, 64, P.surface, 6, 0);
  ctx.fillStyle = P.ink;
  ctx.fillText(c.game, pad + 22, tagY + 34);
  const badge = c.badge[outcome];
  ctx.font = zh ? `44px ${families.cjk}` : `32px ${families.latin}`;
  const badgeW = Math.ceil(ctx.measureText(badge).width) + 52;
  box(ctx, W - pad - 12 - badgeW, tagY - 8, badgeW, 80, BADGE_FILL[outcome], 8, 12);
  ctx.fillStyle = P.ink;
  ctx.fillText(badge, W - pad - 12 - badgeW + 26, tagY + 34);

  // headline: line 2 on a yellow highlight block
  const hlSizes = zh ? [88, 76, 64] : [56, 48, 40];
  const size1 = fit(ctx, line1, display, hlSizes, inner);
  const size2 = fit(ctx, line2, display, hlSizes, inner - 40);
  const hs = Math.min(size1, size2);
  ctx.font = `${hs}px ${display}`;
  ctx.fillStyle = P.ink;
  const h1y = 368;
  ctx.fillText(line1, pad, h1y);
  const l2w = Math.ceil(ctx.measureText(line2).width);
  const h2y = h1y + hs + 48;
  ctx.fillStyle = P.hi;
  ctx.fillRect(pad - 10, h2y - hs / 2 - 20, l2w + 40, hs + 40);
  ctx.fillStyle = P.ink;
  ctx.fillText(line2, pad + 10, h2y + (zh ? 0 : 2));

  // accuracy duel card (compact)
  const cardY = 548;
  const cardH = 300;
  box(ctx, pad, cardY, inner - 18, cardH, P.surface);
  ctx.fillStyle = P.muted;
  ctx.font = zh ? `32px ${families.cjk}` : `22px ${families.latin}`;
  ctx.fillText(c.accuracy, pad + 40, cardY + 56);
  const rows: [string, number | null, string, string][] = [
    [c.you, human, P.human, P.humanText],
    [c.ai, ai, P.ai, P.aiText],
  ];
  rows.forEach(([who, pct, fill, text], i) => {
    const ry = cardY + 148 + i * 108;
    ctx.fillStyle = text;
    ctx.font = zh && who !== "AI" ? `40px ${families.cjk}` : `32px ${families.latin}`;
    ctx.fillText(who, pad + 40, ry);
    segBar(ctx, pad + 168, ry - 26, inner - 18 - 168 - 120, 48, pct, fill);
    ctx.fillStyle = text;
    ctx.font = `40px ${families.latin}`;
    ctx.textAlign = "right";
    ctx.fillText(pct == null ? "--" : `${pct}%`, pad + inner - 18 - 40, ry + 2);
    ctx.textAlign = "left";
  });

  // stat tiles (compact)
  const tileY = 876;
  const tileH = 132;
  const gap = 28;
  const tileW = Math.floor((inner - 12 - gap * (stats.length - 1)) / stats.length);
  stats.forEach((stat, i) => {
    const tx = pad + i * (tileW + gap);
    box(ctx, tx, tileY, tileW, tileH, P.surface, 8, 12);
    ctx.fillStyle = P.muted;
    ctx.font = zh ? `28px ${families.cjk}` : `20px ${families.latin}`;
    ctx.fillText(stat.label, tx + 28, tileY + 44);
    ctx.fillStyle = P.ink;
    const valueSize = fit(ctx, stat.value, families.latin, [52, 40, 32], tileW - 56 - (stat.unit ? 40 : 0));
    ctx.font = `${valueSize}px ${families.latin}`;
    ctx.fillText(stat.value, tx + 28, tileY + 96);
    if (stat.unit) {
      const vw = ctx.measureText(stat.value).width;
      ctx.font = `28px ${families.cjk}`;
      ctx.fillStyle = P.muted;
      ctx.fillText(stat.unit, tx + 28 + vw + 8, tileY + 98);
    }
  });

  // hero scan zone: full-width terminal block, centered colorful QR + one hook line
  const scanY = 1044;
  const scanH = POSTER_HEIGHT - pad - scanY;
  const scanW = inner - 18;
  box(ctx, pad, scanY, scanW, scanH, P.ink, 0, 18);

  const hookSize = fit(ctx, scanHook, families.latin, [44, 38, 32], scanW - 80);
  ctx.font = `${hookSize}px ${families.latin}`;
  ctx.fillStyle = P.surface;
  ctx.textAlign = "center";
  ctx.fillText(scanHook, pad + scanW / 2, scanY + 56);

  const qr = POSTER_HERO_QR_PX;
  const qrBlock = qr + QR_FRAME * 2;
  const qrX = pad + Math.floor((scanW - qrBlock) / 2);
  const zoneTop = scanY + 96;
  const zoneBottom = scanY + scanH - 36;
  const qrY = zoneTop + Math.floor((zoneBottom - zoneTop - qrBlock) / 2);
  drawPixelQrFrame(ctx, qrX + QR_FRAME, qrY + QR_FRAME, qr, QR_FRAME);
  drawPixelColorQr(ctx, input.url, qrX + QR_FRAME, qrY + QR_FRAME, qr);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("poster_failed"))), "image/png"));
}
