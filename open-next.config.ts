import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * SEO pages (home, keyword and content pages) are fully static (no revalidate, no cookies, no DB). Their prerendered
 * HTML ships with each deploy as Workers Static Assets, and cache interception answers them without booting the Next
 * page renderer. Read-only by design: content changes only with a new deploy, so nothing goes stale after a deploy.
 * Dynamic routes (/play, /result, /share, leaderboard, level pages, sitemap) are force-dynamic and unaffected.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
