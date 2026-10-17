import type { Locale } from "./config";
import commonEn from "./messages/en";
import { gameMessageCatalogs } from "../games/messages";

/**
 * gettext-style UI messages for the game app. The message id is the original Chinese copy
 * (so zh needs no catalog); other locales map id -> translation. `{name}` placeholders are interpolated.
 */
export type Vars = Record<string, string | number>;
export type T = (id: string, vars?: Vars) => string;

/** common + every registered game's namespace (ids must not overlap; enforced by tests). */
const en: Record<string, string> = Object.assign({}, commonEn, ...gameMessageCatalogs.map((catalog) => catalog.en ?? {}));
const catalogs: Partial<Record<Locale, Record<string, string>>> = { en };

/** `{n}` → value; `{n|level|levels}` → singular/plural word for n (English-style one/other). */
const interpolate = (text: string, vars?: Vars) =>
  vars
    ? text
        .replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (match, key: string, one: string, other: string) => (key in vars ? (Number(vars[key]) === 1 ? one : other) : match))
        .replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match))
    : text;

export function translate(locale: Locale, id: string, vars?: Vars) {
  const catalog = catalogs[locale];
  return interpolate(catalog?.[id] ?? id, vars);
}

export const translator = (locale: Locale): T => (id, vars) => translate(locale, id, vars);

/** Locale used when no provider/locale is passed (unit tests, legacy callers). */
export const FALLBACK_MESSAGE_LOCALE: Locale = "zh";

export const catalogFor = (locale: Locale) => catalogs[locale];
