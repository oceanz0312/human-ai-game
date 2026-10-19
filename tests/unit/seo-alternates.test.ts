import { HIDDEN_HUB_PATHS, SITE_URL } from "@/config/site";
import { languageAlternates } from "@/seo/alternates";
import { buildSitemap } from "@/app/sitemap";
import robots from "@/app/robots";
import { staticSeoRoutes } from "@/seo/routes";

test("English only: hreflang is self + x-default", () => {
  expect(SITE_URL).toBe("https://spotthedifferencegame.com");
  expect(languageAlternates("/faq")).toEqual({ en: `${SITE_URL}/faq`, "x-default": `${SITE_URL}/faq` });
  expect(languageAlternates("/")).toEqual({ en: SITE_URL, "x-default": SITE_URL });
});

test("sitemap is English only and never lists the hidden hub", () => {
  const entries = buildSitemap(staticSeoRoutes());
  expect(entries.every((e) => !e.url.includes("/zh"))).toBe(true);
  expect(entries.map((e) => e.url)).not.toContain(`${SITE_URL}/games`);
  expect(entries.map((e) => e.url)).toEqual(expect.arrayContaining([SITE_URL, `${SITE_URL}/printable`, `${SITE_URL}/christmas`, `${SITE_URL}/halloween`, `${SITE_URL}/thanksgiving`, `${SITE_URL}/winter`, `${SITE_URL}/find-the-difference`]));
});

test("robots.txt disallows only the hub itself (end-anchored), keeping /games/<slug>/* crawlable", () => {
  const rules = robots().rules as { disallow: string[] }[];
  expect(HIDDEN_HUB_PATHS).toEqual(["/games"]);
  expect(rules[0].disallow).toEqual(["/api/", "/games$"]);
});

test("sitemap never lists level pages (/games/<slug>/levels/N are noindex)", async () => {
  const { default: sitemap } = await import("@/app/sitemap");
  const urls = (await sitemap()).map((e) => e.url);
  expect(urls.some((url) => url.includes("/levels/"))).toBe(false);
  expect(urls).toContain(`${SITE_URL}/games/spot-the-difference/leaderboard`);
});
