import type { Locale } from "@/i18n/config";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Web-first page frame for the hub, content and SEO pages: sticky header, scrollable body (option B), footer. */
export function SiteShell({ locale, path, children, className }: { locale: Locale; path: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`site-page${className ? ` ${className}` : ""}`}>
      <SiteHeader locale={locale} path={path} />
      <main className="site-main">{children}</main>
      <SiteFooter locale={locale} />
    </div>
  );
}
