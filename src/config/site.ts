/** Canonical public origin (apex, no www). Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://spotthedifferencegame.com").replace(/\/+$/, "");
/** Brand = head keyword. Used verbatim in header, title template, footer, JSON-LD and meta (6 places, keep consistent). */
export const SITE_NAME = "Spot The Difference Game";
/** Old origin; everything there 301s to SITE_URL. */
export const LEGACY_HOSTS = ["human-ai.zdychanges.workers.dev"];
/** Platform hub: reachable by direct URL only, hidden from bots (noindex,nofollow, robots Disallow, no sitemap, no crawlable links). */
export const HIDDEN_HUB_PATHS = ["/games"];
export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;

/** Favicon / app icons / web manifest, served from public/ (pixel duck "spot the difference" icon). */
export const SITE_ICONS = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    { url: "/icon.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
};
export const SITE_MANIFEST = "/manifest.webmanifest";

/** Public contact mailbox (Cloudflare Email Routing on oceanz.me forwards it to the owner; receive-only). */
export const CONTACT_EMAIL = "support@oceanz.me";
