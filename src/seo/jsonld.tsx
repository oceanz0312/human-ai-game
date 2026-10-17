import { absoluteUrl, SITE_NAME, SITE_URL } from "@/config/site";
import type { GameEntry } from "@/games/registry";
import { localePath, type Locale } from "@/i18n/config";

type Json = Record<string, unknown>;

/** Server-rendered JSON-LD block (escapes "<" so content can't close the script tag). */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const inLanguage: Record<Locale, string> = { en: "en", zh: "zh-Hans" };

export const websiteLd = (locale: Locale): Json => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: absoluteUrl(localePath(locale, "/")),
  inLanguage: inLanguage[locale],
});

export const organizationLd = (): Json => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
});

export const gameLd = (game: GameEntry, locale: Locale, name: string, description: string): Json => ({
  "@context": "https://schema.org",
  "@type": ["VideoGame", "WebApplication"],
  name,
  description,
  url: absoluteUrl(localePath(locale, game.landingPath)),
  image: absoluteUrl(game.image),
  inLanguage: inLanguage[locale],
  genre: game.jsonLdGenre,
  gamePlatform: "Web browser",
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  playMode: "SinglePlayer",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
});

export const faqLd = (items: { q: string; a: string }[]): Json => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
});

export const breadcrumbLd = (locale: Locale, crumbs: { name: string; path: string }[]): Json => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(localePath(locale, crumb.path)),
  })),
});

/** Home hub: every live registry game as an ItemList (coming-soon placeholders are never listed). */
export const itemListLd = (locale: Locale, name: string, items: { name: string; path: string }[]): Json => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    url: absoluteUrl(localePath(locale, item.path)),
  })),
});
