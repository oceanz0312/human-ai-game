// Smoke for the HTML5 package: node scripts/smoke-html5.mjs <http-base-of-unzipped-ng> [file-url]. Aborts and records any non-local request.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const BASE = process.argv[2];
const catalog = JSON.parse(readFileSync("html5/generated/catalog.ts", "utf8").match(/HTML5_LEVELS: Html5Level\[\] = (.*);/)[1]);
mkdirSync("test-results/html5-smoke", { recursive: true });
const browser = await chromium.launch();
const results = {};
async function run(name, url, width, strategy, shots) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 375 ? 667 : 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const external = [], errors = [];
  await ctx.route("**/*", (r) => { const u = r.request().url(); if (!u.startsWith(BASE) && !u.startsWith("file:") && !u.startsWith("data:")) { external.push(u); return r.abort(); } return r.continue(); });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url);
  if (shots) await page.screenshot({ path: `test-results/html5-smoke/${width}-title.png` });
  const version = await page.getByTestId("version").textContent();
  await page.getByTestId("start").click();
  let levels = 0, wins = 0, aiCorrect = [];
  for (let i = 0; i < 25; i++) {
    const over = await page.getByTestId("game-over").count();
    if (over) break;
    const lvl = Number((await page.locator(".hud-level .level").textContent()).split("/")[0]);
    await page.locator(".board img").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const lv = catalog[lvl - 1];
    if (shots && lvl === (width === 375 ? 6 : 2)) await page.screenshot({ path: `test-results/html5-smoke/${width}-play-l6.png` });
    if (strategy === "timeout") await page.locator('[data-testid="reveal-next"]').waitFor({ timeout: 15000 });
    else {
      const choice = strategy === "correct" ? lv.correctChoice : lv.choices.find((c) => c !== lv.correctChoice);
      await page.locator(`[data-answer="${choice}"]`).tap();
    }
    await page.getByTestId("reveal-next").waitFor();
    const verdict = await page.getByTestId("verdict").textContent();
    aiCorrect.push((await page.locator(".faster-note").textContent()).includes("correct"));
    if (shots && lvl === (width === 375 ? 6 : 2)) { await page.waitForTimeout(1300); await page.screenshot({ path: `test-results/html5-smoke/${width}-reveal-l6.png` }); }
    if (/win|faster|beat/i.test(verdict)) wins++;
    levels++;
    await page.getByTestId("reveal-next").click();
  }
  await page.getByTestId("game-over").waitFor();
  const final = await page.getByTestId("final-level").textContent();
  if (shots) await page.screenshot({ path: `test-results/html5-smoke/${width}-over.png` });
  const storage = await page.evaluate(() => ({ ...localStorage }));
  const anchors = await page.locator("a[href]").count();
  console.log(name, "done");results[name] = { version, levels, final, aiCorrectByLevel: aiCorrect.map((c) => (c ? 1 : 0)).join(""), external, errors, best: storage["stdh5.best.v1"], anchors };
  await ctx.close();
}
await run("correct-375", BASE + "/index.html", 375, "correct", true);
await run("wrong-390", BASE + "/index.html", 390, "wrong", true);
await run("timeout-390", BASE + "/index.html", 390, "timeout", false);
// offline: throttle network to offline after first load, then reload from cache is not possible without SW; instead load via file://
await run("file-correct-390", process.argv[3] ?? "file://" + process.cwd() + "/dist-html5/ng/index.html", 390, "correct", false);
console.log(JSON.stringify(results, null, 1));
await browser.close();
