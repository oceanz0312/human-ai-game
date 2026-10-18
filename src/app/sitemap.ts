import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { localePath, locales } from "@/i18n/config";
import { languageAlternates } from "@/seo/alternates";
import { staticSeoRoutes, type SeoRoute } from "@/seo/routes";
import { gameLeaderboardPath, liveGames } from "@/games/registry";

/** Level pages (/games/<slug>/levels/N) are noindex and never listed (plan "Approved v2"). */
export const dynamic = "force-dynamic";

export function buildSitemap(routes: SeoRoute[]): MetadataRoute.Sitemap {
  return routes.flatMap((route) =>
    locales.map((locale) => ({
      url: absoluteUrl(localePath(locale, route.path)),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages: languageAlternates(route.path) },
    })),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicRoutes: SeoRoute[] = liveGames().map((game) => ({ path: gameLeaderboardPath(game), priority: 0.5, changeFrequency: "daily" as const }));
  return buildSitemap([...staticSeoRoutes(), ...dynamicRoutes]);
}
