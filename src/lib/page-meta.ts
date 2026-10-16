import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

/** Per-page metadata. PR4 extends this with canonical, hreflang alternates and Open Graph. */
export function pageMetadata(_locale: Locale, _path: string, copy: { title: string; description: string }, opts: { index?: boolean } = {}): Metadata {
  return {
    title: { absolute: copy.title },
    description: copy.description,
    robots: opts.index === false ? { index: false, follow: true } : undefined,
  };
}
