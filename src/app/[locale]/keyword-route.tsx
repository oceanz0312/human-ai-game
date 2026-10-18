import type { Metadata } from "next";
import { KEYWORD_PAGES } from "@/content/keyword-pages";
import { pageMetadata } from "@/lib/page-meta";

/** Metadata for an English keyword page (title/description/canonical/OG from src/content/keyword-pages.ts). */
export function keywordMetadata(path: string): Metadata {
  const page = KEYWORD_PAGES[path];
  return pageMetadata("en", path, { title: page.title, description: page.description });
}
