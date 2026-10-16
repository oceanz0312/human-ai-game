import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import { SiteTop } from "./SiteTop";

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
}) {
  return (
    <main className={`mobile-shell info-page one-screen${className ? ` ${className}` : ""}`}>
      <SiteTop locale={locale} path={path} />
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
    </main>
  );
}
