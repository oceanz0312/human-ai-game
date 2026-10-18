import Link from "next/link";
import { hreflang, localeLabel, localePath, locales, type Locale } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { gamePlayPath, liveGames } from "@/games/registry";
import { Button } from "@/components/ui/8bit";

export function SiteLogo({ href }: { href: string }) {
  return (
    <Link className="site-logo" href={href} aria-label="Spot The Difference Game">
      <span className="site-logo-mark" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      Spot The Difference Game
    </Link>
  );
}

function LangSwitch({ locale, path }: { locale: Locale; path: string }) {
  return (
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
  );
}

/** Primary navigation items. Live games come straight from the registry, so a new game shows up here automatically. */
export function navItems(locale: Locale) {
  const { nav, gameCopy } = getPages(locale);
  return [
    { href: "/games", label: nav.games },
    ...liveGames().map((game) => ({ href: game.landingPath, label: gameCopy[game.slug]?.name ?? game.slug })),
    { href: "/faq", label: nav.faq },
  ];
}

/** `path` is the locale-neutral route path of the current page (used for aria-current and the language switch). */
export function SiteHeader({ locale, path }: { locale: Locale; path: string }) {
  const { nav, ui } = getPages(locale);
  const items = navItems(locale);
  const first = liveGames()[0];
  const isCurrent = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`));
  return (
    <header className="site-header">
      <div className="container">
        <SiteLogo href={localePath(locale, "/")} />
        <nav className="site-nav" aria-label={nav.games}>
          {items.map((item) => (
            <Link key={item.href} href={localePath(locale, item.href)} aria-current={isCurrent(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="site-header-spacer" />
        <LangSwitch locale={locale} path={path} />
        {first ? (
          <Button variant="primary" className="nav-cta" href={localePath(locale, gamePlayPath(first))}>
            {nav.play}
          </Button>
        ) : null}
        <details className="nav-menu">
          <summary aria-label={ui.menu}>
            <span className="nav-menu-icon" aria-hidden />
          </summary>
          <div className="nav-menu-panel">
            {items.map((item) => (
              <Link key={item.href} href={localePath(locale, item.href)}>
                {item.label}
              </Link>
            ))}
            {first ? <Link href={localePath(locale, gamePlayPath(first))}>{nav.play}</Link> : null}
            <div className="lang-row">
              <LangSwitch locale={locale} path={path} />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
