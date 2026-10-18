import { SITE_URL } from "@/config/site";
import { languageAlternates } from "@/seo/alternates";
import { buildSitemap } from "@/app/sitemap";
import { staticSeoRoutes } from "@/seo/routes";

test("English only: hreflang is self + x-default", () => {
  expect(languageAlternates("/faq")).toEqual({ en: `${SITE_URL}/faq`, "x-default": `${SITE_URL}/faq` });
  expect(languageAlternates("/")).toEqual({ en: SITE_URL, "x-default": SITE_URL });
});

test("sitemap is English only", () => {
  const entries = buildSitemap(staticSeoRoutes());
  expect(entries.length).toBeGreaterThan(5);
  expect(entries.every((e) => !e.url.includes("/zh") && !e.url.includes("/ai-opponents"))).toBe(true);
});
