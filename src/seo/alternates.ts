import { absoluteUrl } from "@/config/site";
import { defaultLocale, hreflang, localePath, locales, type Locale } from "@/i18n/config";

/** hreflang map for a locale-neutral path: public locales only (English: self + x-default). */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[hreflang[locale]] = absoluteUrl(localePath(locale, path));
  languages["x-default"] = absoluteUrl(localePath(defaultLocale, path));
  return languages;
}

export const canonicalUrl = (locale: Locale, path: string) => absoluteUrl(localePath(locale, path));
