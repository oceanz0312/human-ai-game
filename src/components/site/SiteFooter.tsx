import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { gameLeaderboardPath, liveGames } from "@/games/registry";

/** Registry-driven footer: a new live game shows up in the Games column automatically. */
export function SiteFooter({ locale }: { locale: Locale }) {
  const { nav, ui, gameCopy } = getPages(locale);
  const games = liveGames();
  const columns = [
    {
      title: ui.footerGames,
      links: [
        ...games.map((game) => ({ href: game.landingPath, label: gameCopy[game.slug]?.name ?? game.slug })),
        { href: "/games", label: nav.games },
        ...(games[0] ? [{ href: gameLeaderboardPath(games[0]), label: nav.leaderboard }] : []),
      ],
    },
    {
      title: ui.footerLearn,
      links: [
        { href: "/how-to-play", label: nav.howToPlay },
        { href: "/human-vs-ai", label: nav.humanVsAi },
        { href: "/ai-opponents", label: nav.opponents },
        { href: "/faq", label: nav.faq },
      ],
    },
    {
      title: ui.footerSite,
      links: [
        { href: "/about", label: nav.about },
        { href: "/privacy", label: nav.privacy },
        { href: "/terms", label: nav.terms },
      ],
    },
  ];
  return (
    <footer className="site-footer">
      <div className="container site-footer-grid">
        <div className="site-footer-brand">
          <p className="site-footer-name">HUMAN VS AI</p>
          <p>{ui.footerTagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="site-footer-title">{column.title}</h2>
            {column.links.map((link) => (
              <Link key={link.href} href={localePath(locale, link.href)}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
