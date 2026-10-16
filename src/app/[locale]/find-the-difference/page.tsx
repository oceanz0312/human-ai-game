import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

type Props = { params: Promise<{ locale: string }> };

const PATH = "/find-the-difference";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.findTheDifference);
}

export default async function Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.findTheDifference;
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[{ href: "/spot-the-difference", label: nav.spot }, { href: "/how-to-play", label: nav.howToPlay }, { href: "/human-vs-ai", label: nav.humanVsAi }, { href: "/faq", label: nav.faq }]}
    >
      <div className="info-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/levels/v1/12.png" alt={copy.h1} width={360} height={360} />
      </div>
    </InfoPage>
  );
}
