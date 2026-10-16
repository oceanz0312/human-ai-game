import { SITE_URL } from "@/config/site";
import { languageAlternates } from "@/seo/alternates";
import { buildSitemap } from "@/app/sitemap";

test("hreflang alternates are absolute, reciprocal and include x-default", () => {
  expect(languageAlternates("/faq")).toEqual({ en: `${SITE_URL}/faq`, "zh-Hans": `${SITE_URL}/zh/faq`, "x-default": `${SITE_URL}/faq` });
  expect(languageAlternates("/")).toEqual({ en: SITE_URL, "zh-Hans": `${SITE_URL}/zh`, "x-default": SITE_URL });
});

test("sitemap emits one entry per locale with alternates", () => {
  const entries = buildSitemap([{ path: "/faq", priority: 0.5, changeFrequency: "monthly" }]);
  expect(entries.map((e) => e.url)).toEqual([`${SITE_URL}/faq`, `${SITE_URL}/zh/faq`]);
  expect(entries[1].alternates?.languages).toHaveProperty("x-default");
});
