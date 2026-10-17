import type { Metadata, Viewport } from "next";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/shell.css";
import "@/styles/game.css";
import "@/styles/site.css";
import { htmlLang } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { Analytics } from "@/components/site/Analytics";
import { getCookieLocale } from "@/i18n/server";

export const metadata: Metadata = { title: "HUMAN VS AI" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

/** Root layout for session-bound app pages (/play, /result, /share). Locale comes from the hv_locale cookie. */
export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCookieLocale();
  return (
    <html lang={htmlLang[locale]}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
