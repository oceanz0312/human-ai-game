import Link from "next/link";
import { THEME_CARDS, type KeywordPageContent } from "@/content/keyword-pages";
import { QuickBoard } from "@/games/spot-the-difference/quick/QuickBoard";
import { StartButton } from "@/components/StartButton";
import { breadcrumbLd, faqLd, JsonLd, organizationLd, videoGameLd, websiteLd } from "@/seo/jsonld";
import { SiteShell } from "./SiteShell";
import { AdSlot } from "./AdSlot";

/** One keyword page: H1 + playable board in the first screen, then the page's own copy, FAQ and related links. */
export function KeywordPage({ page, children }: { page: KeywordPageContent; children?: React.ReactNode }) {
  const isHome = page.path === "/";
  const ld = [
    videoGameLd(page.path, page.h1, page.description),
    faqLd(page.faq),
    ...(isHome ? [websiteLd("en"), organizationLd()] : [breadcrumbLd("en", [{ name: "Home", path: "/" }, { name: page.nav, path: page.path }])]),
  ];
  const demo = page.hero === "demo";
  const cta = demo ? (
    <StartButton label="▶ Play Spot the Difference" sublabel="20 levels · vs AI" busyLabel="Starting…" locale="en" direct trackClick={{ name: "hero_cta_click", metadata: { page: page.path, placement: "hero" } }} />
  ) : (
    <StartButton label="Spot the Difference Game: 20 levels vs AI" busyLabel="Starting…" locale="en" variant="secondary" trackClick={{ name: "kw_cta_click", metadata: { page: page.path, placement: "below-board" } }} />
  );
  const board = (
    <div className={`kw-board kw-board-${page.board.mode}`}>
      {demo ? <QuickBoard mode={page.board.mode} seed={page.board.seed} title={page.board.label} demo page={page.path} /> : <QuickBoard mode={page.board.mode} seed={page.board.seed} title={page.board.label} cta={cta} startLabel={page.board.start} />}
    </div>
  );
  return (
    <SiteShell locale="en" path={page.path}>
      <JsonLd data={ld} />
      <div className="container kw-page">
        <section className={`kw-hero${demo ? " kw-hero-demo" : ""}`} data-testid="kw-hero">
          <div className="kw-head">
            <h1 className="page-title kw-title">{page.h1}</h1>
            <p className="kw-lede">{page.lede}</p>
          </div>
          {/* Demo hero: the CTA sits right under the lede on phones (above the board), so it never covers the cells. */}
          {demo ? <div className="kw-cta kw-cta-hero">{cta}</div> : null}
          {board}
          {demo ? null : <div className="kw-cta kw-cta-secondary" data-testid="kw-cta-secondary">{cta}</div>}
        </section>
        {demo ? (
          <>
            <p className="kw-more" data-testid="kw-more">
              Looking for the full game with all 20 levels? → <Link href="/spot-the-difference-game">spot the difference game</Link>
            </p>
            <nav className="kw-themes" aria-label="Spot the difference themes" data-testid="kw-themes">
              {THEME_CARDS.map((card) => (
                <Link key={card.href} className="card kw-theme" href={card.href}>
                  <strong>{card.label}</strong>
                  <span>{card.blurb}</span>
                </Link>
              ))}
            </nav>
          </>
        ) : null}
        <AdSlot name={`${page.path === "/" ? "home" : page.path.slice(1)}-below-hero`} />
        <div className="info-body kw-body">
          {page.sections.map((section) => (
            <section key={section.h2}>
              <h2>{section.h2}</h2>
              {section.paragraphs?.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {section.list ? (
                <ul>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          {children}
          <section>
            <h2>Frequently asked questions</h2>
            <div className="faq-list">
              {page.faq.map((item) => (
                <details key={item.q} className="card faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
        <AdSlot name={`${page.path === "/" ? "home" : page.path.slice(1)}-native`} format="native" />
        <nav className="info-links" aria-label="More puzzles">
          <h2 className="info-links-title">More puzzles</h2>
          <div className="info-links-grid">
            {page.links.map((link) => (
              <Link key={link.href} className="info-link" href={link.href}>
                {link.label} →
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </SiteShell>
  );
}
