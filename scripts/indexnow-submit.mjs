#!/usr/bin/env node
// Submit every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver… share submissions via api.indexnow.org).
// Usage: node scripts/indexnow-submit.mjs [--sitemap <url>] [--dry-run]
//   default sitemap: https://<host>/sitemap.xml (live). Only URLs on the configured host are sent.
// The key is public by design (src/config/indexnow.json + public/<key>.txt); nothing secret is read or printed.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const config = JSON.parse(readFileSync(path.join(ROOT, "src/config/indexnow.json"), "utf8"));

/** <loc> values from a sitemap.xml (sitemap index files are not used by this site). */
export function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

/** IndexNow JSON body: unique URLs on our host only (max 10,000 per request). */
export function buildPayload(urls, cfg = config) {
  const urlList = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).host === cfg.host;
    } catch {
      return false;
    }
  });
  if (urlList.length > 10_000) throw new Error(`too many URLs (${urlList.length} > 10000)`);
  return { host: cfg.host, key: cfg.key, keyLocation: cfg.keyLocation, urlList };
}

async function main(argv) {
  const dry = argv.includes("--dry-run");
  const i = argv.indexOf("--sitemap");
  const sitemap = i >= 0 ? argv[i + 1] : `https://${config.host}/sitemap.xml`;
  const res = await fetch(sitemap, { headers: { "user-agent": "indexnow-submit (spotthedifferencegame.com)" } });
  if (!res.ok) throw new Error(`sitemap ${sitemap} → HTTP ${res.status}`);
  const payload = buildPayload(parseSitemapLocs(await res.text()));
  console.log(`sitemap ${sitemap}: ${payload.urlList.length} URLs on ${payload.host}`);
  for (const u of payload.urlList) console.log(`  ${u}`);
  if (dry) return console.log("dry run: nothing submitted");
  const key = await fetch(config.keyLocation);
  const keyText = key.ok ? (await key.text()).trim() : "";
  if (keyText !== config.key) throw new Error(`key file ${config.keyLocation} → HTTP ${key.status}, content ${keyText === "" ? "missing" : "mismatch"}; deploy it first`);
  const sub = await fetch(config.endpoint, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(payload) });
  const body = (await sub.text()).slice(0, 300);
  console.log(`POST ${config.endpoint} → HTTP ${sub.status} ${sub.statusText}${body ? ` ${body}` : ""}`);
  // 200 = accepted, 202 = accepted, key validation pending. Anything else is a failure.
  if (sub.status !== 200 && sub.status !== 202) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(String(err?.message ?? err));
    process.exitCode = 1;
  });
}
