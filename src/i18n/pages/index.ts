import type { Locale } from "../config";
import en, { type PagesDictionary } from "./en";
import zh from "./zh";

const all: Record<Locale, PagesDictionary> = { en, zh };
export const getPages = (locale: Locale) => all[locale];
export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
export type { PagesDictionary };
