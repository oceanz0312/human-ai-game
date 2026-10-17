import localFont from "next/font/local";

/**
 * Self-hosted pixel type (no third-party font CDN).
 * - Fusion Pixel 12px (OFL): CJK + Latin display face, subset by scripts/subset-pixel-font.py
 *   to the glyphs the UI copy uses. Render only at 12/24/36/48px.
 * - Press Start 2P (OFL): Latin display face for numbers and the logo.
 * - JetBrains Mono (OFL): AI terminal / code face.
 * The CSS variables are consumed by src/styles/tokens.css.
 */
export const pixelFont = localFont({
  src: "../styles/fonts/fusion-pixel-12-subset.woff2",
  variable: "--font-fusion-pixel",
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["PingFang SC", "Noto Sans CJK SC", "system-ui", "sans-serif"],
});

export const pixelLatinFont = localFont({
  src: "../styles/fonts/press-start-2p-latin-400-normal.woff2",
  variable: "--font-press-start",
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["monospace"],
});

export const monoFont = localFont({
  src: [
    { path: "../styles/fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../styles/fonts/jetbrains-mono-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

/** Class list for <html>: exposes the font CSS variables to the whole document. */
export const fontVariables = `${pixelFont.variable} ${pixelLatinFont.variable} ${monoFont.variable}`;
