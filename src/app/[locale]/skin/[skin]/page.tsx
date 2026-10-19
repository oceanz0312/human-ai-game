import { notFound } from "next/navigation";
import { KeywordPage } from "@/components/site/KeywordPage";
import { KEYWORD_PAGES } from "@/content/keyword-pages";
import { isSkinId, SKIN_IDS } from "@/config/skin-calendar";
import { keywordMetadata } from "../../keyword-route";

/**
 * Prerendered home variant per seasonal skin. Served only at "/" through the middleware rewrite (src/middleware.ts);
 * /skin/* itself 301s to "/" and is not in the sitemap. The HTML IS the home page, so its metadata is the home
 * page's exactly (canonical "/", indexable): a noindex here would de-index "/".
 */
export const dynamicParams = false;
export const generateStaticParams = async ({ params }: { params: { locale: string } }) => (params.locale === "en" ? SKIN_IDS.map((skin) => ({ skin })) : []);
export const generateMetadata = () => keywordMetadata("/");

export default async function SkinnedHomePage({ params }: { params: Promise<{ skin: string }> }) {
  const { skin } = await params;
  if (!isSkinId(skin)) notFound();
  return <KeywordPage page={KEYWORD_PAGES["/"]} skin={skin} />;
}
