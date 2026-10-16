"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LOCALE_COOKIE, isLocale, localeFromPathname, localePath, stripLocale, type Locale } from "@/i18n/config";

const DISMISS_COOKIE = "hv_locale_banner";
const prompts: Record<Locale, { text: string; go: string; close: string }> = {
  en: { text: "View this page in English?", go: "English", close: "Dismiss" },
  zh: { text: "切换到中文页面？", go: "中文", close: "关闭" },
};

const readCookie = (name: string) => document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))?.split("=")[1];
const setCookie = (name: string, value: string) => (document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`);

/** Suggests the browser's language without redirecting (no forced IP/Accept-Language redirects). */
export function LocaleBanner() {
  const pathname = usePathname() ?? "/";
  const current = localeFromPathname(pathname);
  const [suggested, setSuggested] = useState<Locale | null>(null);

  useEffect(() => {
    if (readCookie(DISMISS_COOKIE)) return;
    const chosen = readCookie(LOCALE_COOKIE);
    if (isLocale(chosen)) return;
    const preferred = (navigator.languages ?? [navigator.language]).map((tag) => tag.toLowerCase().split("-")[0]).find(isLocale);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only signal
    if (preferred && preferred !== current) setSuggested(preferred);
  }, [current]);

  if (!suggested) return null;
  const copy = prompts[suggested];
  return (
    <div className="locale-banner" role="region" aria-label={copy.text} lang={suggested === "zh" ? "zh-CN" : "en"} data-testid="locale-banner">
      <span>{copy.text}</span>
      <Link href={localePath(suggested, stripLocale(pathname))} hrefLang={suggested} onClick={() => setCookie(LOCALE_COOKIE, suggested)}>
        {copy.go}
      </Link>
      <button
        type="button"
        onClick={() => {
          setCookie(DISMISS_COOKIE, "1");
          setSuggested(null);
        }}
      >
        {copy.close}
      </button>
    </div>
  );
}
