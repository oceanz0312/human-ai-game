import type { Metadata, Viewport } from "next";
import "../globals.css";
import { htmlLang } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { Analytics } from "@/components/site/Analytics";
import { getCookieLocale } from "@/i18n/server";

export const metadata: Metadata = { title: "HUMAN / AI" };

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
    <html lang={htmlLang[locale]} className="one-screen-app">
      <body className="one-screen-app">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
