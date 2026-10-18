/** Canonical public origin (apex, no www). Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://spotthedifferencegame.com").replace(/\/+$/, "");
/** Brand = head keyword. Used verbatim in header, title template, footer, JSON-LD and meta (6 places, keep consistent). */
export const SITE_NAME = "Spot The Difference Game";
/** Old origin; everything there 301s to SITE_URL. */
export const LEGACY_HOSTS = ["human-ai.zdychanges.workers.dev"];
/** Platform hub: reachable by direct URL only, hidden from bots (noindex,nofollow, robots Disallow, no sitemap, no crawlable links). */
export const HIDDEN_HUB_PATHS = ["/games"];
export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
