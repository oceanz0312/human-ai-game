// Pre-renders 1200×630 Open Graph images per locale into public/og/<locale>/<key>.png (CJK-safe via system fonts).
// Run: node scripts/generate-og.mjs   (needs Playwright + a Chromium/Chrome with CJK fonts)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const copy = {
  en: {
    home: ["Find the Difference", "Can you beat a real AI?"],
    "spot-the-difference": ["Spot the Difference", "20 levels vs a real AI"],
    "find-the-difference": ["Find the Difference", "3×3 to 9×9, the clock keeps shrinking"],
    "human-vs-ai": ["Human vs AI", "Real AI, real speed, no fake bots"],
    default: ["HUMAN VS AI", "Browser games vs real AI"],
  },
  zh: {
    home: ["大家来找茬", "你比 AI 更快吗？"],
    "spot-the-difference": ["大家来找茬", "20 关，和真实 AI 比快"],
    "find-the-difference": ["找不同", "从 3×3 到 9×9，时间越来越短"],
    "human-vs-ai": ["人类 vs AI", "真实 AI，真实速度"],
    default: ["HUMAN VS AI", "和真实 AI 比赛的网页小游戏"],
  },
};

const html = (title, sub) => `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;box-sizing:border-box;padding:72px;background:#fff;color:#111;font-family:Inter,'PingFang SC','Noto Sans CJK SC','Noto Sans SC',sans-serif;display:flex;flex-direction:column;justify-content:space-between">
<div style="font-size:28px;font-weight:800;letter-spacing:5px">HUMAN VS AI</div>
<div><div style="font-size:104px;font-weight:800;letter-spacing:-3px;line-height:1">${title}</div>
<div style="font-size:42px;color:#777;margin-top:28px">${sub}</div></div>
<div style="display:flex;gap:16px;align-items:center;font-size:30px;font-weight:700"><span style="width:20px;height:20px;border-radius:50%;background:#6d5dfc"></span>You vs AI</div>
</div></body></html>`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [locale, entries] of Object.entries(copy)) {
  mkdirSync(`public/og/${locale}`, { recursive: true });
  for (const [key, [title, sub]] of Object.entries(entries)) {
    await page.setContent(html(title, sub));
    await page.screenshot({ path: `public/og/${locale}/${key}.png` });
  }
}
await browser.close();
