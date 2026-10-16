import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "../globals.css";
import { defaultLocale, htmlLang, isLocale, LOCALE_COOKIE } from "@/i18n/config";

export const metadata: Metadata = { title: "HUMAN / AI" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

/** Root layout for session-bound app pages (/play, /result, /share). Locale comes from the hv_locale cookie. */
export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : defaultLocale;
  return (
    <html lang={htmlLang[locale]} className="one-screen-app">
      <body className="one-screen-app">{children}</body>
    </html>
  );
}
