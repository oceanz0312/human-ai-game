import Link from "next/link";
import type { KeywordPageContent } from "@/content/keyword-pages";
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
  const cta = <StartButton label="Play 20 levels vs AI ▶" busyLabel="Starting…" locale="en" />;
  return (
    <SiteShell locale="en" path={page.path}>
      <JsonLd data={ld} />
      <div className="container kw-page">
        <section className="kw-hero" data-testid="kw-hero">
          <div className="kw-head">
            <h1 className="page-title kw-title">{page.h1}</h1>
            <p className="kw-lede">{page.lede}</p>
          </div>
          <div className="kw-board">
            <QuickBoard mode={page.board.mode} seed={page.board.seed} title={page.board.label} cta={cta} />
          </div>
          <div className="kw-cta">{cta}</div>
        </section>
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
