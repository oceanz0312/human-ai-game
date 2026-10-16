import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { localePath, locales } from "@/i18n/config";
import { languageAlternates } from "@/seo/alternates";
import { staticSeoRoutes, type SeoRoute } from "@/seo/routes";

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

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(staticSeoRoutes());
}
