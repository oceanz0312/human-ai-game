/** Canonical public origin. Set NEXT_PUBLIC_SITE_URL in .env.production (one line) to move to humanvsai.app. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://human-ai.zdychanges.workers.dev").replace(/\/+$/, "");
/** Brand = head keyword. Used verbatim in header, title template, footer, JSON-LD and meta (keep consistent). */
export const SITE_NAME = "Spot The Difference Game";
export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
