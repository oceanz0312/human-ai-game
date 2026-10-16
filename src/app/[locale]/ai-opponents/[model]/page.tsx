import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { aiOpponents, getOpponent } from "@/games/registry";
import { locales, resolveLocaleParam } from "@/i18n/config";
import { fill, getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

type Props = { params: Promise<{ locale: string; model: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => locales.flatMap((locale) => aiOpponents.map((opponent) => ({ locale, model: opponent.slug })));

const vars = (slug: string) => {
  const opponent = getOpponent(slug);
  return opponent ? { model: opponent.model, provider: opponent.provider, api: opponent.api } : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { model } = await params;
  const v = vars(model);
  if (!v) return {};
  const copy = getPages(locale).pages.opponent;
  return pageMetadata(locale, `/ai-opponents/${model}`, { title: fill(copy.title, v), description: fill(copy.description, v) });
}

export default async function OpponentPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { model } = await params;
  const v = vars(model);
  if (!v) notFound();
  const { nav, pages } = getPages(locale);
  const copy = pages.opponent;
  return (
    <InfoPage
      locale={locale}
      path={`/ai-opponents/${model}`}
      eyebrow={copy.eyebrow}
      h1={fill(copy.h1, v)}
      intro={fill(copy.intro, v)}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[
        { href: "/spot-the-difference", label: nav.spot },
        { href: "/human-vs-ai", label: nav.humanVsAi },
        { href: "/ai-opponents", label: nav.opponents },
        { href: "/faq", label: nav.faq },
      ]}
    />
  );
}
