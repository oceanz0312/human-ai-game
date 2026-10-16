/** Locale registry. English is the default and lives at the root with no prefix; others live under /<locale>. */
export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "hv_locale";

/** hreflang codes per locale (Google accepts ISO 639-1 + optional script/region). */
export const hreflang: Record<Locale, string> = { en: "en", zh: "zh-Hans" };
/** <html lang> per locale. */
export const htmlLang: Record<Locale, string> = { en: "en", zh: "zh-CN" };

export const isLocale = (value: unknown): value is Locale => typeof value === "string" && (locales as readonly string[]).includes(value);

/** Normalise a path: leading slash, no trailing slash (root stays "/"). */
export function normalizePath(path: string) {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

/** Public path for a locale-neutral route path, e.g. ("zh", "/faq") -> "/zh/faq"; ("en", "/faq") -> "/faq". */
export function localePath(locale: Locale, path = "/") {
  const clean = normalizePath(path);
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Locale from a public pathname. */
export function localeFromPathname(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return isLocale(first) && first !== defaultLocale ? first : defaultLocale;
}

/** Strip the locale prefix from a public pathname. */
export function stripLocale(pathname: string) {
  const locale = localeFromPathname(pathname);
  if (locale === defaultLocale) return normalizePath(pathname);
  return normalizePath(pathname.slice(locale.length + 1) || "/");
}

export const localeLabel: Record<Locale, string> = { en: "English", zh: "中文" };
