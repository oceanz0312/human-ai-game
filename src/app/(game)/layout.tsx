import type { Metadata, Viewport } from "next";
import "@/styles/tailwind.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/core/fx/fx.css";
import "@/styles/shell.css";
import "@/styles/game.css";
import "@/styles/site.css";
import "@/styles/ui.css";
import { fontVariables } from "@/lib/fonts";
import { SITE_ICONS, SITE_MANIFEST, SITE_NAME } from "@/config/site";
import { htmlLang } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { Analytics } from "@/components/site/Analytics";
import { SfxBootstrap } from "@/core/fx/SfxBootstrap";
import { getCookieLocale } from "@/i18n/server";
import { resolveSkin } from "@/config/skin-calendar";
import { skinStyle } from "@/config/skins";

export const metadata: Metadata = { title: SITE_NAME, icons: SITE_ICONS, manifest: SITE_MANIFEST };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

/** Root layout for session-bound app pages (/play, /result, /share). Locale comes from the hv_locale cookie. */
export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCookieLocale();
  // Seasonal skin (accent color only; boards, puzzles and the simulated AI never change). Already per-request here.
  const { skin } = resolveSkin({ now: new Date(), envDate: process.env.SKIN_DATE });
  return (
    <html lang={htmlLang[locale]} className={fontVariables}>
      <body data-skin={skin} style={skinStyle(skin)}>
        <I18nProvider locale={locale}>
          <SfxBootstrap />
          {children}
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
