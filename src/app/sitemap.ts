import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { localePath, locales } from "@/i18n/config";
import { languageAlternates } from "@/seo/alternates";
import { staticSeoRoutes, type SeoRoute } from "@/seo/routes";
import { gameLeaderboardPath, gameLevelPath, liveGames } from "@/games/registry";
import { isIndexableLevel, loadLevelStats } from "@/seo/level-stats";

/** Data-gated: level pages appear only once they carry enough real runs. */
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
  const stats = await loadLevelStats();
  const dynamicRoutes: SeoRoute[] = liveGames().flatMap((game) => [
    { path: gameLeaderboardPath(game), priority: 0.5, changeFrequency: "daily" as const },
    ...Array.from({ length: game.levels }, (_, i) => i + 1)
      .filter((level) => game.slug !== "spot-the-difference" || isIndexableLevel(stats.get(level)))
      .map((level) => ({ path: gameLevelPath(game, level), priority: 0.5, changeFrequency: "weekly" as const })),
  ]);
  return buildSitemap([...staticSeoRoutes(), ...dynamicRoutes]);
}
