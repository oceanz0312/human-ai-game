import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { liveGames } from "@/games/registry";

export function SiteFooter({ locale }: { locale: Locale }) {
  const { nav, ui, gameCopy } = getPages(locale);
  const links = [
    { href: "/games", label: nav.games },
    ...liveGames().map((game) => ({ href: game.landingPath, label: gameCopy[game.slug]?.name ?? game.slug })),
    { href: "/human-vs-ai", label: nav.humanVsAi },
    { href: "/how-to-play", label: nav.howToPlay },
    { href: "/ai-opponents", label: nav.opponents },
    { href: "/faq", label: nav.faq },
    { href: "/about", label: nav.about },
    { href: "/privacy", label: nav.privacy },
    { href: "/terms", label: nav.terms },
  ];
  return (
    <footer className="site-footer">
      <div className="container">
        <p>HUMAN VS AI · {ui.footerTagline}</p>
        <nav aria-label={ui.related}>
          {links.map((link) => (
            <Link key={link.href} href={localePath(locale, link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
