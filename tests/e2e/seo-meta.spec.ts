import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CONTENT_PATHS } from "./helpers";

const SITE = /NEXT_PUBLIC_SITE_URL=(\S+)/.exec(readFileSync(".env.production", "utf8"))![1].replace(/\/$/, "");
const abs = (path: string) => `${SITE}${path === "/" ? "" : path}`;
const zh = (path: string) => (path === "/" ? "/zh" : `/zh${path}`);
const attr = (html: string, re: RegExp) => re.exec(html)?.[1] ?? null;

const INDEXABLE = CONTENT_PATHS.filter((p) => p !== "/games/spot-the-difference/play");

for (const path of INDEXABLE) {
  for (const [locale, url] of [["en", path], ["zh", zh(path)]] as const) {
    test(`raw HTML SEO for ${url}`, async ({ request }) => {
      const html = await (await request.get(url)).text();
      expect(attr(html, /<title>([^<]+)<\/title>/), "title").toBeTruthy();
      expect(attr(html, /<meta name="description" content="([^"]+)"/), "description").toBeTruthy();
      expect(html, "h1 in HTML").toMatch(/<h1[^>]*>[^<]+/);
      expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toBe(abs(url));
      expect(attr(html, /<link rel="alternate" hrefLang="en" href="([^"]+)"/)).toBe(abs(path));
      expect(attr(html, /<link rel="alternate" hrefLang="zh-Hans" href="([^"]+)"/)).toBe(abs(zh(path)));
      expect(attr(html, /<link rel="alternate" hrefLang="x-default" href="([^"]+)"/)).toBe(abs(path));
      expect(html).not.toMatch(/<meta name="robots" content="noindex/);
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      expect(blocks.length, `${locale} JSON-LD`).toBeGreaterThan(0);
    });
  }
}

test("structured data per page type", async ({ request }) => {
  const types = async (url: string) =>
    [...(await (await request.get(url)).text()).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .flatMap((m) => [JSON.parse(m[1])].flat())
      .map((d) => [d["@type"]].flat().join("+"));
  expect(await types("/")).toEqual(expect.arrayContaining(["WebSite", "Organization", "VideoGame+WebApplication"]));
  expect(await types("/spot-the-difference")).toEqual(expect.arrayContaining(["BreadcrumbList", "VideoGame+WebApplication"]));
  expect(await types("/faq")).toEqual(expect.arrayContaining(["BreadcrumbList", "FAQPage"]));
});

test("query parameters canonicalize to the clean URL", async ({ request }) => {
  const html = await (await request.get("/spot-the-difference?ref=poster&utm_source=x")).text();
  expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toBe(abs("/spot-the-difference"));
});

test("app pages are noindex", async ({ request }) => {
  const html = await (await request.get("/games/spot-the-difference/play")).text();
  expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
  const play = await (await request.get("/play/00000000-0000-0000-0000-000000000000")).text();
  expect(play).toMatch(/<meta name="robots" content="noindex/);
});

test("sitemap lists every indexable page with hreflang alternates", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  for (const path of INDEXABLE) {
    expect(xml).toContain(`<loc>${abs(path)}</loc>`);
    expect(xml).toContain(`<loc>${abs(zh(path))}</loc>`);
  }
  expect(xml).toContain('hreflang="x-default"');
  expect(xml).not.toContain("/play");
});

test("robots.txt allows crawling, blocks the API and points to the sitemap", async ({ request }) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toMatch(/Disallow: \/api\//);
  expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});
