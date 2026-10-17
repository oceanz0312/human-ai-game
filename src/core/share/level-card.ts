/**
 * Core share kit · single-level highlight card ("我在第 7 关赢了 AI"). Game-agnostic: the game passes
 * its board thumbnail; the card adds the headline, both times and the link. Renders on a canvas in the browser.
 */
export interface LevelCardInput {
  imageUrl: string;
  headline: string;
  lines: string[];
  url: string;
  brand: string;
}

export const LEVEL_CARD_SIZE = 1080;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image_failed"));
    image.src = url;
  });
}

export async function renderLevelCard(input: LevelCardInput): Promise<Blob> {
  const size = LEVEL_CARD_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas");
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--f-display").trim() || "monospace";
  const ink = css.getPropertyValue("--c-ink").trim() || "#1a1c2c";
  const paper = css.getPropertyValue("--c-paper").trim() || "#f4f4f4";
  const hi = css.getPropertyValue("--c-hi").trim() || "#ffec27";
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, size, size);
  // Pixel frame
  ctx.fillStyle = ink;
  ctx.fillRect(24, 24, size - 48, 12);
  ctx.fillRect(24, size - 36, size - 48, 12);
  ctx.fillRect(24, 24, 12, size - 48);
  ctx.fillRect(size - 36, 24, 12, size - 48);

  ctx.fillStyle = hi;
  ctx.fillRect(72, 72, size - 144, 120);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `48px ${display}`;
  ctx.fillText(input.headline, size / 2, 132, size - 180);

  const board = await loadImage(input.imageUrl).catch(() => null);
  const boardSize = 600;
  const bx = (size - boardSize) / 2;
  const by = 228;
  if (board) ctx.drawImage(board, bx, by, boardSize, boardSize);
  ctx.lineWidth = 8;
  ctx.strokeRect(bx, by, boardSize, boardSize);

  ctx.font = `36px ${display}`;
  input.lines.slice(0, 2).forEach((line, index) => ctx.fillText(line, size / 2, by + boardSize + 64 + index * 52, size - 160));
  ctx.font = `24px ${display}`;
  ctx.fillText(`${input.brand} · ${input.url}`, size / 2, size - 84, size - 160);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no_blob"))), "image/png"));
}

/** Native share sheet with the PNG when possible, otherwise a download. */
export async function shareLevelCard(blob: Blob, filename: string, text: string, url: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], text, url });
    return "shared" as const;
  }
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 2000);
  return "downloaded" as const;
}
