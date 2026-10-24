// Visual-regression samples for the pixel share poster (PR-7).
// Bundles src/lib/poster.ts with esbuild, loads it in Chrome with the *shipped* font subset
// (src/styles/fonts/fusion-pixel-12-subset.woff2), renders win/loss/zero cases per locale, and fails if any
// poster glyph is missing from the subset.
// Run: PW_CHANNEL=chrome node scripts/render-share-samples.mjs [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(process.argv[2] ?? "test-results/share-samples");
mkdirSync(out, { recursive: true });

const bundle = await build({
  entryPoints: [path.join(root, "src/lib/poster.ts")],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "Poster",
  platform: "browser",
  alias: { "@": path.join(root, "src") },
});
const font = (file) => readFileSync(path.join(root, "src/styles/fonts", file)).toString("base64");
const html = `<!doctype html><html><head><style>
@font-face{font-family:"FusionPixelSubset";src:url(data:font/woff2;base64,${font("fusion-pixel-12-subset.woff2")}) format("woff2");}
@font-face{font-family:"PressStart2P";src:url(data:font/woff2;base64,${font("press-start-2p-latin-400-normal.woff2")}) format("woff2");}
:root{--font-fusion-pixel:"FusionPixelSubset";--font-press-start:"PressStart2P";}
</style></head><body></body></html>`;

const cases = {
  win: { reachedLevel: 9, played: 9, humanCorrect: 7, aiCorrect: 5, fasterThanAiCount: 4, cleared: false },
  loss: { reachedLevel: 15, played: 15, humanCorrect: 12, aiCorrect: 14, fasterThanAiCount: 5, cleared: false },
  cleared: { reachedLevel: 20, played: 22, humanCorrect: 20, aiCorrect: 14, fasterThanAiCount: 11, cleared: true },
};

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage();
await page.setContent(html);
await page.addScriptTag({ content: bundle.outputFiles[0].text });
for (const locale of ["zh", "en"]) {
  for (const [name, stats] of Object.entries(cases)) {
    const b64 = await page.evaluate(
      async ({ stats, locale }) => {
        const blob = await window.Poster.renderPoster({ ...stats, locale, url: "https://human-ai.zdychanges.workers.dev/share/AbCdEfGhIjKlMnOpQrStUv", shortUrl: "human-ai.zdychanges.workers.dev/share/AbCdEfGhIjKlMnOpQrStUv" });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s = "";
        for (const b of bytes) s += String.fromCharCode(b);
        return btoa(s);
      },
      { stats, locale },
    );
    const file = path.join(out, `poster-${locale}-${name}.png`);
    writeFileSync(file, Buffer.from(b64, "base64"));
    console.log(file);
  }
}

await browser.close();

// Dynamic /share/[publicId] OG card (next/og), rendered in Node from the same module the route uses.
const ogBundle = path.join(root, "node_modules/.cache/share-og-sample.mjs");
await build({
  entryPoints: [path.join(root, "src/lib/share-og.tsx")],
  bundle: true,
  outfile: ogBundle,
  format: "esm",
  platform: "node",
  // next/og is CommonJS without an exports map entry for ESM; resolve it via require at runtime.
  plugins: [{ name: "next-og-cjs", setup(b) { b.onResolve({ filter: /^next\/og$/ }, () => ({ path: "next/og.js", external: true })); } }],
  jsx: "automatic",
  external: ["next", "next/*", "react", "react/*"],
  banner: { js: "import { createRequire } from \"node:module\"; const require = createRequire(import.meta.url);" },
  alias: { "@": path.join(root, "src") },
});
const { renderShareOg } = await import(ogBundle);
for (const [name, stats] of Object.entries({ ...cases, missing: null })) {
  const file = path.join(out, `share-og-${name}.png`);
  writeFileSync(file, Buffer.from(await renderShareOg(stats).arrayBuffer()));
  console.log(file);
}

// Glyph coverage: every non-ASCII character in the share copy must be in the shipped pixel subset.
const copyChars = [...new Set(readFileSync(path.join(root, "src/lib/share-copy.ts"), "utf8"))].filter((ch) => ch.codePointAt(0) > 0x7f && ch.trim());
const check = spawnSync(
  "python3",
  ["-c", "import sys;from fontTools.ttLib import TTFont;c=TTFont(sys.argv[1]).getBestCmap();print(''.join(ch for ch in sys.argv[2] if ord(ch) not in c))", path.join(root, "src/styles/fonts/fusion-pixel-12-subset.woff2"), copyChars.join("")],
  { encoding: "utf8" },
);
if (check.status !== 0) throw new Error(check.stderr);
const missing = check.stdout.trim().replace(/[—·]/g, "");
if (missing) {
  console.error(`Missing from pixel subset: ${missing} — run python3 scripts/subset-pixel-font.py`);
  process.exit(1);
}
console.log(`pixel subset covers all ${copyChars.length} share-copy glyphs`);
