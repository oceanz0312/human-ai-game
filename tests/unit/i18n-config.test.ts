import { localeFromPathname, localePath, normalizePath, stripLocale } from "@/i18n/config";

test("default locale has no prefix; others are prefixed", () => {
  expect(localePath("en", "/")).toBe("/");
  expect(localePath("en", "/faq/")).toBe("/faq");
  expect(localePath("zh", "/")).toBe("/zh");
  expect(localePath("zh", "faq")).toBe("/zh/faq");
});

test("locale detection from pathname", () => {
  // zh is no longer a public locale: /zh/* redirects to English.
  expect(localeFromPathname("/zh/faq")).toBe("en");
  expect(localeFromPathname("/faq")).toBe("en");
  expect(localeFromPathname("/zhx")).toBe("en");
  expect(stripLocale("/zh/faq")).toBe("/zh/faq");
  expect(stripLocale("/zh")).toBe("/zh");
  expect(normalizePath("/a/b/")).toBe("/a/b");
});
