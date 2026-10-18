import type { MetadataRoute } from "next";
import { HIDDEN_HUB_PATHS, SITE_URL } from "@/config/site";

/**
 * Session/app pages stay crawlable so their meta noindex is seen; the API is disallowed.
 * The platform hub (/games exactly) is disallowed with an end anchor so /games/<slug>/levels/* and
 * /games/<slug>/leaderboard stay crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...HIDDEN_HUB_PATHS.map((path) => `${path}$`)] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
