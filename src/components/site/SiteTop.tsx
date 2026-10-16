import Link from "next/link";
import { localePath, localeLabel, locales, hreflang, type Locale } from "@/i18n/config";

/** Brand link + language switcher. `path` is the locale-neutral route path of the current page. */
export function SiteTop({ locale, path }: { locale: Locale; path: string }) {
  return (
    <div className="topline site-top">
      <Link className="brand" href={localePath(locale, "/")}>
        HUMAN / AI
      </Link>
      <nav className="lang-switch" aria-label="Language">
        {locales.map((other) =>
          other === locale ? (
            <span key={other} className="lang-current" aria-current="true">
              {localeLabel[other]}
            </span>
          ) : (
            <Link key={other} href={localePath(other, path)} hrefLang={hreflang[other]} lang={hreflang[other]}>
              {localeLabel[other]}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
