import { KeywordPage } from "@/components/site/KeywordPage";
import { KEYWORD_PAGES } from "@/content/keyword-pages";
import { keywordMetadata } from "./keyword-route";

/** Home = "spot the difference": H1 + a playable board in the first screen (not a platform hub). */
export const generateMetadata = () => keywordMetadata("/");

export default function HomePage() {
  return <KeywordPage page={KEYWORD_PAGES["/"]} />;
}
