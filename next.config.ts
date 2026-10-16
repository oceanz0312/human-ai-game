import type { NextConfig } from "next";

/** First path segments that must never be rewritten into the English locale tree. */
const UNPREFIXED_EXCLUDE = "(?:zh|en|api|play|result|share|_next|levels)(?:/|$)|sitemap\\.xml$|robots\\.txt$|favicon\\.ico$";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql"],
  poweredByHeader: false,
  trailingSlash: false,
  async redirects() {
    // The default locale has no prefix: /en and /en/* are permanent (308) redirects to the unprefixed URL.
    return [
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
      // A game's structured base path never competes with its keyword landing page.
      { source: "/games/spot-the-difference", destination: "/spot-the-difference", permanent: true },
      { source: "/zh/games/spot-the-difference", destination: "/zh/spot-the-difference", permanent: true },
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
