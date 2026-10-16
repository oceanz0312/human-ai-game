/** Canonical public origin. Set NEXT_PUBLIC_SITE_URL in .env.production (one line) to move to humanvsai.app. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://human-ai.zdychanges.workers.dev").replace(/\/+$/, "");
export const SITE_NAME = "HUMAN / AI";
export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
