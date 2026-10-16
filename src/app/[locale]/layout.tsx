import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { htmlLang, isLocale, locales } from "@/i18n/config";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export const metadata: Metadata = { title: "HUMAN / AI" };

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
    <html lang={htmlLang[locale]} className="one-screen-app">
      <body className="one-screen-app">{children}</body>
    </html>
  );
}
