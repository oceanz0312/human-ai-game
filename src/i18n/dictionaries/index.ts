import type { Locale } from "../config";
import en, { type Dictionary } from "./en";
import zh from "./zh";

const dictionaries: Record<Locale, Dictionary> = { en, zh };
export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];
export type { Dictionary };
