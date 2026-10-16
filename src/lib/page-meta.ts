import type { Metadata } from "next";
import { SITE_NAME } from "@/config/site";
import type { Locale } from "@/i18n/config";
import { canonicalUrl, languageAlternates } from "@/seo/alternates";

const ogLocale: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };

/**
 * Per-page metadata: absolute title, description, self-referencing canonical (query strings such as
 * ?ref/?utm are dropped by construction), hreflang alternates + x-default, Open Graph and Twitter.
 */
export function pageMetadata(
  locale: Locale,
  path: string,
  copy: { title: string; description: string },
  opts: { index?: boolean; image?: string } = {},
): Metadata {
  const url = canonicalUrl(locale, path);
  const images = opts.image ? [{ url: opts.image, width: 1200, height: 630, alt: copy.title }] : undefined;
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      url,
      locale: ogLocale[locale],
      alternateLocale: Object.entries(ogLocale).filter(([key]) => key !== locale).map(([, value]) => value),
      ...(images ? { images } : {}),
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description, ...(opts.image ? { images: [opts.image] } : {}) },
    robots: opts.index === false ? { index: false, follow: true } : { index: true, follow: true },
  };
}
