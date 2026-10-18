import { KeywordPage } from "@/components/site/KeywordPage";
import { KEYWORD_PAGES } from "@/content/keyword-pages";
import { keywordMetadata } from "../keyword-route";

const PATH = "/hard";
export const generateMetadata = () => keywordMetadata(PATH);

export default function Page() {
  return <KeywordPage page={KEYWORD_PAGES[PATH]} />;
}
