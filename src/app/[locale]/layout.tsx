import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/shell.css";
import "@/styles/game.css";
import "@/styles/site.css";
import { htmlLang, isLocale, locales } from "@/i18n/config";
import { SITE_NAME, SITE_URL } from "@/config/site";
import { I18nProvider } from "@/i18n/client";
import { Analytics } from "@/components/site/Analytics";
import { LocaleBanner } from "@/components/site/LocaleBanner";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export const metadata: Metadata = { metadataBase: new URL(SITE_URL), title: SITE_NAME, applicationName: SITE_NAME };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={htmlLang[locale]}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <LocaleBanner />
        <Analytics />
      </body>
    </html>
  );
}
