/** Indexable English routes. Dynamic (data-gated) routes are appended by the sitemap. The hidden hub (/games) is never listed. */
export interface SeoRoute {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}

export function staticSeoRoutes(): SeoRoute[] {
  return [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/spot-the-difference-game", priority: 0.9, changeFrequency: "daily" },
    { path: "/find-the-difference", priority: 0.9, changeFrequency: "weekly" },
    { path: "/printable", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pictures", priority: 0.8, changeFrequency: "monthly" },
    { path: "/christmas", priority: 0.8, changeFrequency: "weekly" },
    { path: "/easy", priority: 0.7, changeFrequency: "monthly" },
    { path: "/hard", priority: 0.7, changeFrequency: "monthly" },
    { path: "/for-kids", priority: 0.7, changeFrequency: "monthly" },
    { path: "/how-to-play", priority: 0.6, changeFrequency: "monthly" },
    { path: "/human-vs-ai", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
    { path: "/about", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];
}
