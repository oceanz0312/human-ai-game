import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { SiteShell } from "./SiteShell";
import { getPages } from "@/i18n/pages";
import { breadcrumbLd, JsonLd } from "@/seo/jsonld";

export interface InfoLink {
  href: string;
  label: string;
}

/**
 * One-screen content page (option A): H1, a short server-rendered intro, optional body,
 * a primary action and up to 6 link cards. Never scrolls at 375×667 and up.
 */
export function InfoPage({
  locale,
  path,
  eyebrow,
  h1,
  intro,
  children,
  action,
  links = [],
  className,
  ld = [],
}: {
  locale: Locale;
  path: string;
  eyebrow: string;
  h1: string;
  intro: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  links?: InfoLink[];
  className?: string;
  /** Extra JSON-LD blocks (BreadcrumbList is always added). */
  ld?: Record<string, unknown>[];
}) {
  const { nav } = getPages(locale);
  const parents: Record<string, string> = { "/games": nav.games, "/ai-opponents": nav.opponents, "/spot-the-difference": nav.spot };
  const crumbs = [{ name: nav.home, path: "/" }];
  const segments = path.split("/").filter(Boolean);
  for (let i = 1; i < segments.length; i += 1) {
    const parent = `/${segments.slice(0, i).join("/")}`;
    if (parents[parent]) crumbs.push({ name: parents[parent], path: parent });
  }
  if (path !== "/") crumbs.push({ name: h1, path });
  return (
    <SiteShell locale={locale} path={path}>
      <div className={`container info-page${className ? ` ${className}` : ""}`}>
      <JsonLd data={[breadcrumbLd(locale, crumbs), ...ld]} />
      <section className="info-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{h1}</h1>
        <p className="body-text info-intro">{intro}</p>
      </section>
      {children ? <div className="info-body">{children}</div> : <div className="info-body" />}
      <div className="info-foot">
        {action}
        {links.length ? (
          <nav className="info-links" aria-label="Related">
            {links.slice(0, 6).map((link) => (
              <Link key={link.href} className="info-link" href={localePath(locale, link.href)}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
      </div>
    </SiteShell>
  );
}
