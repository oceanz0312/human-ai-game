import type { LevelSeoProvider } from "@/core/seo/level-pages";
import { spotLevelSeo } from "./spot-the-difference/level-seo";

/** Games that publish per-level SEO pages. A game without an entry simply has no /levels/[n] pages. */
const providers: Record<string, LevelSeoProvider> = { "spot-the-difference": spotLevelSeo };

export const levelSeoFor = (slug: string) => providers[slug];
