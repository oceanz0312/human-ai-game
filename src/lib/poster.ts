import { FALLBACK_MESSAGE_LOCALE } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { POSTER_PALETTE } from "./pixel-palette";
import { drawPosterModqr } from "./poster-pixel-qr";
import { accuracy, posterFooterCopy, posterHeadline, posterStats, shareCopy, shareOutcome, type ShareOutcome, type ShareStats } from "./share-copy";

export { posterHeadline } from "./share-copy";
export { POSTER_PALETTE } from "./pixel-palette";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1920;
/** Footer QR (modqr pixel); balanced for classic CTA strip layout. */
export const POSTER_FOOTER_QR_PX = 280;
/** @deprecated Use POSTER_FOOTER_QR_PX — classic layout is footer-only. */
export const POSTER_HERO_QR_PX = POSTER_FOOTER_QR_PX;

const P = POSTER_PALETTE;

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
  const gap = 8;
  const seg = Math.floor((w - gap * (segs - 1)) / segs);
  const on = pct == null ? 0 : Math.round(pct / 10);
  for (let i = 0; i < segs; i += 1) {
    const sx = x + i * (seg + gap);
    ctx.fillStyle = P.ink;
    ctx.fillRect(sx, y, seg, h);
    ctx.fillStyle = i < on ? fill : P.paper;
    ctx.fillRect(sx + 4, y + 4, seg - 8, h - 8);
  }
}

export type PosterInput = ShareStats & { url: string; shortUrl: string; locale?: Locale };

/** Draws the 9:16 pixel-style result poster: classic layout + modqr footer QR. */
export async function renderPoster(input: PosterInput) {
  const locale = input.locale ?? FALLBACK_MESSAGE_LOCALE;
  const zh = locale === "zh";
  const c = shareCopy(locale);
  const outcome = shareOutcome(input);
  const [line1, line2] = posterHeadline(input, locale);
  const stats = posterStats(input, locale);
  const human = accuracy(input.humanCorrect, input.played);
  const ai = accuracy(input.aiCorrect, input.played);
  const footer = posterFooterCopy(input.shortUrl, locale);

  const families = fontFamilies();
  const display = zh ? families.cjk : families.latin;
  await loadFonts(families, [line1, line2, c.game, c.accuracy, c.you, footer.prompt, footer.hook, footer.url, c.badge[outcome]].join(""));

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

  box(ctx, pad, pad, inner - 18, 120, P.ink, 0, 18);
  ctx.fillStyle = P.surface;
  ctx.font = `36px ${families.latin}`;
  ctx.fillText("Spot The Difference", pad + 36, pad + 64);
  [P.human, P.hi, P.ai].forEach((fill, i) => {
    const s = 36;
    const bx = pad + inner - 18 - 36 - (3 - i) * (s + 12) + 12;
    ctx.fillStyle = fill;
    ctx.fillRect(bx, pad + 42, s, s);
  });

  const tagY = 264;
  ctx.font = zh ? `36px ${families.cjk}` : `24px ${families.latin}`;
  const tagW = Math.ceil(ctx.measureText(c.game).width) + 48;
  box(ctx, pad, tagY, tagW, 72, P.surface, 6, 0);
  ctx.fillStyle = P.ink;
  ctx.fillText(c.game, pad + 24, tagY + 38);
  const badge = c.badge[outcome];
  ctx.font = zh ? `48px ${families.cjk}` : `36px ${families.latin}`;
  const badgeW = Math.ceil(ctx.measureText(badge).width) + 60;
  box(ctx, W - pad - 12 - badgeW, tagY - 12, badgeW, 96, BADGE_FILL[outcome], 8, 12);
  ctx.fillStyle = P.ink;
  ctx.fillText(badge, W - pad - 12 - badgeW + 30, tagY + 38);

  const hlSizes = zh ? [96, 84, 72] : [64, 56, 48];
  const size1 = fit(ctx, line1, display, hlSizes, inner);
  const size2 = fit(ctx, line2, display, hlSizes, inner - 48);
  const hs = Math.min(size1, size2);
  ctx.font = `${hs}px ${display}`;
  ctx.fillStyle = P.ink;
  const h1y = 470;
  ctx.fillText(line1, pad, h1y);
  const l2w = Math.ceil(ctx.measureText(line2).width);
  const h2y = h1y + hs + 60;
  ctx.fillStyle = P.hi;
  ctx.fillRect(pad - 12, h2y - hs / 2 - 24, l2w + 48, hs + 48);
  ctx.fillStyle = P.ink;
  ctx.fillText(line2, pad + 12, h2y + (zh ? 0 : 4));

  const cardY = 780;
  const cardH = 420;
  box(ctx, pad, cardY, inner - 18, cardH, P.surface);
  ctx.fillStyle = P.muted;
  ctx.font = zh ? `36px ${families.cjk}` : `24px ${families.latin}`;
  ctx.fillText(c.accuracy, pad + 48, cardY + 72);
  const rows: [string, number | null, string, string][] = [
    [c.you, human, P.human, P.humanText],
    [c.ai, ai, P.ai, P.aiText],
  ];
  rows.forEach(([who, pct, fill, text], i) => {
    const ry = cardY + 168 + i * 132;
    ctx.fillStyle = text;
    ctx.font = zh && who !== "AI" ? `48px ${families.cjk}` : `36px ${families.latin}`;
    ctx.fillText(who, pad + 48, ry);
    segBar(ctx, pad + 180, ry - 30, 460, 60, pct, fill);
    ctx.fillStyle = text;
    ctx.font = `48px ${families.latin}`;
    ctx.textAlign = "right";
    ctx.fillText(pct == null ? "--" : `${pct}%`, pad + inner - 18 - 48, ry + 4);
    ctx.textAlign = "left";
  });

  const tileY = 1272;
  const tileH = 192;
  const gap = 36;
  const tileW = Math.floor((inner - 12 - gap * (stats.length - 1)) / stats.length);
  stats.forEach((stat, i) => {
    const tx = pad + i * (tileW + gap);
    box(ctx, tx, tileY, tileW, tileH, P.surface, 8, 12);
    ctx.fillStyle = P.muted;
    ctx.font = zh ? `36px ${families.cjk}` : `24px ${families.latin}`;
    ctx.fillText(stat.label, tx + 36, tileY + 60);
    ctx.fillStyle = P.ink;
    const valueSize = fit(ctx, stat.value, families.latin, [64, 48, 40], tileW - 72 - (stat.unit ? 48 : 0));
    ctx.font = `${valueSize}px ${families.latin}`;
    ctx.fillText(stat.value, tx + 36, tileY + 132);
    if (stat.unit) {
      const vw = ctx.measureText(stat.value).width;
      ctx.font = `36px ${families.cjk}`;
      ctx.fillStyle = P.muted;
      ctx.fillText(stat.unit, tx + 36 + vw + 12, tileY + 136);
    }
  });

  const footY = 1536;
  const footH = POSTER_HEIGHT - pad - footY;
  box(ctx, pad, footY, inner - 18, footH, P.ink, 0, 18);
  const qr = POSTER_FOOTER_QR_PX;
  const qrX = pad + inner - 18 - 36 - qr;
  const qrY = footY + Math.floor((footH - qr) / 2);
  ctx.fillStyle = P.surface;
  ctx.fillRect(qrX - 12, qrY - 12, qr + 24, qr + 24);
  drawPosterModqr(ctx, input.url, qrX, qrY, qr);

  const textMax = qrX - 36 - (pad + 36);
  const footMid = footY + footH / 2;
  ctx.fillStyle = P.termDim;
  ctx.font = zh ? `32px ${families.cjk}` : `24px ${families.latin}`;
  ctx.fillText(footer.prompt, pad + 36, footMid - 54);
  ctx.fillStyle = P.surface;
  const hookSize = fit(ctx, footer.hook, families.cjk, [40, 32, 24], textMax);
  ctx.font = `${hookSize}px ${families.cjk}`;
  ctx.fillText(footer.hook, pad + 36, footMid + 6);
  ctx.fillStyle = P.hi;
  let urlText = footer.url;
  const urlSize = fit(ctx, urlText, families.cjk, [32, 24, 18], textMax);
  ctx.font = `${urlSize}px ${families.cjk}`;
  ctx.fillText(urlText, pad + 36, footMid + 66);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("poster_failed"))), "image/png"));
}
