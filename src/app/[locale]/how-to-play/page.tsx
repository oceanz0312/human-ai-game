import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

type Props = { params: Promise<{ locale: string }> };

const PATH = "/how-to-play";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.howToPlay);
}

export default async function Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.howToPlay;
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[{ href: "/spot-the-difference", label: nav.spot }, { href: "/faq", label: nav.faq }, { href: "/human-vs-ai", label: nav.humanVsAi }, { href: "/find-the-difference", label: nav.find }]}
    >
      <ol className="info-steps">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </InfoPage>
  );
}
