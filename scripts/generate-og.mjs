// Pre-renders 1200×630 pixel-style Open Graph images per locale into public/og/<locale>/<key>.png.
// Fonts are embedded from the repo (no system/CDN fonts): Press Start 2P (Latin display) and the *full*
// Fusion Pixel 12px zh_hans font from assets/ (build-time only, not shipped), so every CJK glyph renders.
// Palette mirrors src/styles/tokens.css. home = platform card (human vs AI games); game pages = board art.
// Run: PW_CHANNEL=chrome node scripts/generate-og.mjs [outDir]   (default public/og)
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const outRoot = path.resolve(process.argv[2] ?? path.join(root, "public/og"));
const b64 = (file) => readFileSync(path.join(root, file)).toString("base64");

const copy = {
  en: {
    home: { kind: "platform", title: "Human vs AI Games", sub: "Browser games against a real AI" },
    "spot-the-difference": { kind: "game", title: "Spot the Difference", sub: "Race a real AI to the odd tile" },
    "find-the-difference": { kind: "game", title: "Find the Difference", sub: "3×3 to 9×9 grids vs a real AI" },
    "human-vs-ai": { kind: "platform", title: "Human vs AI", sub: "Real AI, real speed, no fake bots" },
    default: { kind: "platform", title: "HUMAN VS AI", sub: "Browser games vs a real AI" },
  },
  zh: {
    home: { kind: "platform", title: "人类 VS AI 小游戏", sub: "和真实 AI 同场对战的网页游戏" },
    "spot-the-difference": { kind: "game", title: "大家来找茬", sub: "和真实 AI 比谁先找到不同" },
    "find-the-difference": { kind: "game", title: "找不同", sub: "从 3×3 到 9×9，和 AI 比眼力" },
    "human-vs-ai": { kind: "platform", title: "人类 vs AI", sub: "真实 AI，真实速度，没有假机器人" },
    default: { kind: "platform", title: "HUMAN VS AI", sub: "和真实 AI 比赛的网页小游戏" },
  },
};

const ui = {
  en: { live: "LIVE", soon: "SOON", game1: "Spot the Difference", next: "More games", you: "YOU", vs: "VS", tag: "PLAY FREE" },
  zh: { live: "可玩", soon: "筹备中", game1: "大家来找茬", next: "更多游戏", you: "你", vs: "VS", tag: "免费开玩" },
};

const css = `
@font-face{font-family:FP;src:url(data:font/woff2;base64,${b64("assets/fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2")}) format("woff2");}
@font-face{font-family:PS;src:url(data:font/woff2;base64,${b64("src/styles/fonts/press-start-2p-latin-400-normal.woff2")}) format("woff2");}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:630px;overflow:hidden;-webkit-font-smoothing:none;font-smooth:never}
.og{width:1200px;height:630px;padding:48px 60px;position:relative;color:#1a1c2c;
  background:#f4f4f4 radial-gradient(#d9d9dc 1.5px,transparent 1.6px) 0 0/24px 24px;display:flex;flex-direction:column}
.bar{display:flex;align-items:center;justify-content:space-between;height:72px;padding:0 24px;background:#1a1c2c;color:#fff;box-shadow:12px 12px 0 #1a1c2c;width:1068px}
.brand{font-family:PS;font-size:32px;letter-spacing:2px}
.dots{display:flex;gap:12px}.dots i{width:24px;height:24px;display:block}
.main{flex:1;display:flex;align-items:center;gap:48px;padding-top:24px}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:28px}
.title{font-family:FP,PS;font-size:96px;line-height:1.05;white-space:nowrap}
.en .title{font-family:PS;font-size:56px;line-height:1.25;white-space:normal}
.sub{font-family:FP;font-size:36px;color:#5f574f}
.chip{align-self:flex-start;font-family:FP;font-size:24px;padding:6px 14px;background:#ffec27;border:4px solid #1a1c2c;box-shadow:4px 4px 0 #1a1c2c}
.en .chip{font-family:PS;font-size:16px;padding:10px 14px}
.art{flex:none;width:384px;display:flex;flex-direction:column;gap:20px}
.board{position:relative;width:360px;height:360px;background:#fff;border:8px solid #1a1c2c;box-shadow:12px 12px 0 #1a1c2c;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px}
.board b{background:#c2c3c7;border:4px solid #1a1c2c}
.board b.odd{background:#ffec27}
.cur{position:absolute;font-family:PS;font-size:16px;color:#fff;padding:8px 10px;border:4px solid #1a1c2c}
.cur.you{background:#c8003c;left:186px;top:118px}.cur.ai{background:#0a6abf;left:244px;top:196px}
.cards{display:flex;flex-direction:column;gap:20px}
.card{width:372px;height:100px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:#fff;border:6px solid #1a1c2c;box-shadow:8px 8px 0 #1a1c2c;font-family:FP;font-size:36px}
.en .card{font-size:24px;white-space:nowrap}
.title.latin{font-family:PS;font-size:56px}
.card.soon{background:transparent;border-style:dashed;box-shadow:none;color:#6b6560}
.badge{font-family:FP;font-size:24px;padding:4px 10px;border:4px solid #1a1c2c;background:#00e436;color:#1a1c2c}
.en .badge{font-family:PS;font-size:14px;padding:8px 10px}
.soon .badge{background:#f4f4f4;color:#6b6560;border-color:#6b6560}
.vs{display:flex;align-items:center;gap:16px;font-family:PS;font-size:20px}
.vs span{padding:8px 12px;border:4px solid #1a1c2c;color:#fff}
`;

const art = (kind, u) =>
  kind === "game"
    ? `<div class="board">${Array.from({ length: 9 }, (_, i) => `<b class="${i === 5 ? "odd" : ""}"></b>`).join("")}
       <span class="cur you">${u.you === "你" ? "YOU" : u.you}</span><span class="cur ai">AI</span></div>`
    : `<div class="cards">
       <div class="card"><span>${u.game1}</span><span class="badge">${u.live}</span></div>
       <div class="card soon"><span>${u.next}</span><span class="badge">${u.soon}</span></div>
       <div class="vs"><span style="background:#c8003c">${u.you === "你" ? "YOU" : u.you}</span>VS<span style="background:#0a6abf">AI</span></div></div>`;

const html = (locale, { kind, title, sub }) => {
  const u = ui[locale];
  return `<!doctype html><html><head><style>${css}</style></head><body class="${locale}"><div class="og">
  <div class="bar"><span class="brand">HUMAN VS AI</span><span class="dots"><i style="background:#ff004d"></i><i style="background:#ffec27"></i><i style="background:#29adff"></i></span></div>
  <div class="main"><div class="copy"><span class="chip">${u.tag}</span><div class="title${/^[\x20-\x7e]+$/.test(title) ? " latin" : ""}">${title}</div><div class="sub">${sub}</div></div>
  <div class="art">${art(kind, u)}</div></div></div></body></html>`;
};

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [locale, entries] of Object.entries(copy)) {
  mkdirSync(path.join(outRoot, locale), { recursive: true });
  for (const [key, entry] of Object.entries(entries)) {
    await page.setContent(html(locale, entry));
    await page.evaluate(() => document.fonts.ready);
    // Shrink the title to the pixel grid until it fits two lines (en) / one line (zh).
    await page.evaluate(() => {
      const el = document.querySelector(".title");
      const copy = document.querySelector(".copy");
      const en = document.body.classList.contains("en") || el.classList.contains("latin");
      const steps = en ? [56, 48, 40, 32] : [96, 84, 72, 60, 48];
      for (const s of steps) {
        el.style.fontSize = `${s}px`;
        if (el.scrollWidth <= copy.clientWidth && el.clientHeight <= s * 1.3 * (en ? 2 : 1)) break;
      }
    });
    const file = path.join(outRoot, locale, `${key}.png`);
    await page.screenshot({ path: file });
    console.log(path.relative(root, file));
  }
}
await browser.close();
