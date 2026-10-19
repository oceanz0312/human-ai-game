import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { SITE_NAME } from "@/config/site";

/** Footer: keyword pages + site pages. No link to the hidden platform hub (/games). */
export function SiteFooter(_props: { locale?: Locale }) {
  const columns = [
    {
      title: "Puzzles",
      links: [
        { href: "/", label: "Spot the difference" },
        { href: "/spot-the-difference-game", label: "Spot the difference game" },
        { href: "/find-the-difference", label: "Find the difference" },
        { href: "/pictures", label: "Spot the difference pictures" },
        { href: "/printable", label: "Printable puzzles" },
        { href: "/halloween", label: "Halloween puzzles" },
        { href: "/christmas", label: "Christmas puzzles" },
      ],
    },
    {
      title: "Levels",
      links: [
        { href: "/easy", label: "Easy" },
        { href: "/hard", label: "Hard" },
        { href: "/for-kids", label: "For kids" },
        { href: "/games/spot-the-difference/leaderboard", label: "Leaderboard" },
        { href: "/how-to-play", label: "How to play" },
        { href: "/human-vs-ai", label: "Human vs AI mode" },
      ],
    },
    {
      title: "Site",
      links: [
        { href: "/faq", label: "FAQ" },
        { href: "/about", label: "About" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ],
    },
  ];
  return (
    <footer className="site-footer">
      <div className="container site-footer-grid">
        <div className="site-footer-brand">
          <p className="site-footer-name">{SITE_NAME}</p>
          <p>Free spot the difference puzzles in your browser. Find the odd picture before the AI does.</p>
          <p className="site-footer-copy">© {new Date().getUTCFullYear()} {SITE_NAME}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="site-footer-title">{column.title}</h2>
            {column.links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
