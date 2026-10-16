import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/site/InfoPage";
import { aiOpponents } from "@/games/registry";
import { localePath, resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

type Props = { params: Promise<{ locale: string }> };
const PATH = "/ai-opponents";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.aiOpponents);
}

export default async function OpponentsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.aiOpponents;
  return (
    <InfoPage locale={locale} path={PATH} eyebrow={copy.eyebrow} h1={copy.h1} intro={copy.intro} links={[{ href: "/human-vs-ai", label: nav.humanVsAi }, { href: "/faq", label: nav.faq }]}>
      {aiOpponents.map((opponent) => (
        <Link key={opponent.slug} className="info-link" href={localePath(locale, `/ai-opponents/${opponent.slug}`)}>
          {opponent.model} · {opponent.provider} {opponent.api}
        </Link>
      ))}
    </InfoPage>
  );
}
