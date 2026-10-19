import type { Locale } from "@/i18n/config";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import type { SkinId } from "@/config/skin-calendar";
import { skinStyle } from "@/config/skins";

/** Web-first page frame for the hub, content and SEO pages: sticky header, scrollable body (option B), footer. */
/** `skin` adds only an accent stripe to the header and footer (seasonal-skin plan §5). */
export function SiteShell({ locale, path, children, className, skin }: { locale: Locale; path: string; children: React.ReactNode; className?: string; skin?: SkinId | null }) {
  return (
    <div className={`site-page${className ? ` ${className}` : ""}${skin ? ` skin skin-${skin}` : ""}`} data-skin={skin ?? undefined} style={skinStyle(skin)}>
      <SiteHeader locale={locale} path={path} />
      <main className="site-main">{children}</main>
      <SiteFooter locale={locale} />
    </div>
  );
}
