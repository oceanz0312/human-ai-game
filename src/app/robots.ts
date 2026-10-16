import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

/** Session/app pages stay crawlable so their meta noindex is seen; only the API is disallowed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
