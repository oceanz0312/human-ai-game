import { games } from "@/games/registry";

export interface SeoRoute {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}

/** Indexable, locale-neutral routes. Dynamic (data-gated) routes are appended by the sitemap. */
export function staticSeoRoutes(): SeoRoute[] {
  return [
    { path: "/", priority: 1, changeFrequency: "daily" },
    ...games.filter((g) => g.status === "live").map((g) => ({ path: g.landingPath, priority: 0.9, changeFrequency: "daily" as const })),
    { path: "/find-the-difference", priority: 0.8, changeFrequency: "weekly" },
    { path: "/human-vs-ai", priority: 0.8, changeFrequency: "weekly" },
    { path: "/games", priority: 0.6, changeFrequency: "weekly" },
    { path: "/how-to-play", priority: 0.6, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];
}
