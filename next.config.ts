import type { NextConfig } from "next";

/** First path segments that must never be rewritten into the English locale tree. */
const UNPREFIXED_EXCLUDE = "(?:zh|en|api|play|result|share|_next|levels|og)(?:/|$)|sitemap\\.xml$|robots\\.txt$|favicon\\.ico$";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  poweredByHeader: false,
  trailingSlash: false,
  async redirects() {
    // The default locale has no prefix: /en and /en/* are permanent (308) redirects to the unprefixed URL.
    return [
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
      // English only: every /zh URL goes to its English equivalent (old /zh paths are mapped first).
      { source: "/zh/spot-the-difference", destination: "/", permanent: true },
      { source: "/zh/games/spot-the-difference", destination: "/", permanent: true },
      { source: "/zh/ai-opponents/:path*", destination: "/human-vs-ai", permanent: true },
      { source: "/zh", destination: "/", permanent: true },
      { source: "/zh/:path*", destination: "/:path*", permanent: true },
      // Platform-only opponent pages fold into the human vs AI feature page.
      { source: "/ai-opponents", destination: "/human-vs-ai", permanent: true },
      { source: "/ai-opponents/:path*", destination: "/human-vs-ai", permanent: true },
      // One word, one page: "spot the difference" is the home page.
      { source: "/spot-the-difference", destination: "/", permanent: true },
      { source: "/games/spot-the-difference", destination: "/", permanent: true },
      { source: "/play-online", destination: "/spot-the-difference-game", permanent: true },
    ];
  },
  async rewrites() {
    // English pages are served from app/[locale] with locale "en" without a URL prefix.
    // Session pages (/play, /result, /share), API routes and other locales are left untouched.
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/", destination: "/en" },
        { source: `/:path((?!${UNPREFIXED_EXCLUDE}).+)`, destination: "/en/:path" },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
