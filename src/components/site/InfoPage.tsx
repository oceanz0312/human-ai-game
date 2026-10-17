import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { SiteShell } from "./SiteShell";
import { getPages } from "@/i18n/pages";
import { breadcrumbLd, JsonLd } from "@/seo/jsonld";

export interface InfoLink {
  href: string;
  label: string;
}

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Content page, option B: a self-contained first screen (breadcrumb, H1, intro, primary action, optional aside)
 * followed by an optional scrolling body and related links. All copy is server-rendered.
 */
export function InfoPage({
  locale,
  path,
  eyebrow,
  h1,
  intro,
  children,
  action,
  aside,
  facts,
  links = [],
  className,
  crumbs: crumbsOverride,
  ld = [],
}: {
  locale: Locale;
  path: string;
  eyebrow: string;
  h1: string;
  intro: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** Right-hand visual on desktop (stacks under the intro on phones). */
  aside?: React.ReactNode;
  facts?: string[];
  links?: InfoLink[];
  className?: string;
  /** Crumbs after Home; defaults to the path's known parents + this page. */
  crumbs?: Crumb[];
  /** Extra JSON-LD blocks (BreadcrumbList is always added). */
  ld?: Record<string, unknown>[];
}) {
  const { nav, ui } = getPages(locale);
  const parents: Record<string, string> = { "/games": nav.games, "/ai-opponents": nav.opponents, "/spot-the-difference": nav.spot };
  let crumbs: Crumb[] = [{ name: nav.home, path: "/" }];
  if (crumbsOverride) crumbs = [...crumbs, ...crumbsOverride];
  else {
    const segments = path.split("/").filter(Boolean);
    for (let i = 1; i < segments.length; i += 1) {
      const parent = `/${segments.slice(0, i).join("/")}`;
      if (parents[parent]) crumbs.push({ name: parents[parent], path: parent });
    }
    if (path !== "/") crumbs.push({ name: h1, path });
  }
  return (
    <SiteShell locale={locale} path={path}>
      <JsonLd data={[breadcrumbLd(locale, crumbs), ...ld]} />
      <div className={`container info-page${className ? ` ${className}` : ""}`}>
        <nav className="crumbs" aria-label={ui.breadcrumb}>
          {crumbs.map((crumb, index) =>
            index === crumbs.length - 1 ? (
              <span key={crumb.path} aria-current="page">
                {crumb.name}
              </span>
            ) : (
              <Link key={crumb.path} href={localePath(locale, crumb.path)}>
                {crumb.name}
              </Link>
            ),
          )}
        </nav>
        <section className={aside ? "info-hero has-aside" : "info-hero"}>
          <div className="info-head">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="page-title">{h1}</h1>
            <p className="body-text info-intro">{intro}</p>
            {action ? <div className="info-action">{action}</div> : null}
            {facts?.length ? (
              <ul className="hub-facts">
                {facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {aside ? <div className="info-aside">{aside}</div> : null}
        </section>
        {children ? <div className="info-body">{children}</div> : null}
        {links.length ? (
          <nav className="info-links" aria-label={ui.related}>
            <h2 className="info-links-title">{ui.related}</h2>
            <div className="info-links-grid">
              {links.slice(0, 6).map((link) => (
                <Link key={link.href} className="info-link" href={localePath(locale, link.href)}>
                  {link.label} →
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </SiteShell>
  );
}
