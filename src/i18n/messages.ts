import type { Locale } from "./config";
import en from "./messages/en";

/**
 * gettext-style UI messages for the game app. The message id is the original Chinese copy
 * (so zh needs no catalog); other locales map id -> translation. `{name}` placeholders are interpolated.
 */
export type Vars = Record<string, string | number>;
export type T = (id: string, vars?: Vars) => string;

const catalogs: Partial<Record<Locale, Record<string, string>>> = { en };

const interpolate = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match)) : text;

export function translate(locale: Locale, id: string, vars?: Vars) {
  const catalog = catalogs[locale];
  return interpolate(catalog?.[id] ?? id, vars);
}

export const translator = (locale: Locale): T => (id, vars) => translate(locale, id, vars);

/** Locale used when no provider/locale is passed (unit tests, legacy callers). */
export const FALLBACK_MESSAGE_LOCALE: Locale = "zh";

export const catalogFor = (locale: Locale) => catalogs[locale];
