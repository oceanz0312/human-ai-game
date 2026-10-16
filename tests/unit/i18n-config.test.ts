import { localeFromPathname, localePath, normalizePath, stripLocale } from "@/i18n/config";

test("default locale has no prefix; others are prefixed", () => {
  expect(localePath("en", "/")).toBe("/");
  expect(localePath("en", "/faq/")).toBe("/faq");
  expect(localePath("zh", "/")).toBe("/zh");
  expect(localePath("zh", "faq")).toBe("/zh/faq");
});

test("locale detection from pathname", () => {
  expect(localeFromPathname("/zh/faq")).toBe("zh");
  expect(localeFromPathname("/faq")).toBe("en");
  expect(localeFromPathname("/zhx")).toBe("en");
  expect(stripLocale("/zh/faq")).toBe("/faq");
  expect(stripLocale("/zh")).toBe("/");
  expect(normalizePath("/a/b/")).toBe("/a/b");
});
