import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { SITE_NAME } from "@/config/site";
import { Button } from "@/components/ui/8bit";

export function SiteLogo({ href }: { href: string }) {
  return (
    <Link className="site-logo" href={href} aria-label={SITE_NAME}>
      <span className="site-logo-mark" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      {SITE_NAME}
    </Link>
  );
}

/**
 * Primary navigation: keyword pages only. The platform hub (/games) is deliberately absent – it stays reachable
 * by direct URL but gets no crawlable internal links (SEO plan 2026-10-18).
 */
export function navItems(_locale?: Locale) {
  return [
    { href: "/find-the-difference", label: "Find the difference" },
    { href: "/easy", label: "Easy" },
    { href: "/hard", label: "Hard" },
    { href: "/for-kids", label: "For kids" },
    { href: "/printable", label: "Printable" },
    { href: "/christmas", label: "Christmas" },
  ];
}

/** `path` is the route path of the current page (used for aria-current). */
export function SiteHeader({ path }: { locale?: Locale; path: string }) {
  const items = navItems();
  const isCurrent = (href: string) => path === href;
  return (
    <header className="site-header">
      <div className="container">
        <SiteLogo href="/" />
        <nav className="site-nav" aria-label="Puzzles">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="site-header-spacer" />
        <Button variant="primary" className="nav-cta" href="/spot-the-difference-game">
          Play
        </Button>
        <details className="nav-menu">
          <summary aria-label="Menu">
            <span className="nav-menu-icon" aria-hidden />
          </summary>
          <div className="nav-menu-panel">
            {items.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/spot-the-difference-game">Play 20 levels</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
