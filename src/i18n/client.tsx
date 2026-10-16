"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { FALLBACK_MESSAGE_LOCALE, translator, type T } from "./messages";

const LocaleContext = createContext<Locale>(FALLBACK_MESSAGE_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function useT(): T {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
