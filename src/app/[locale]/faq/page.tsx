import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { faqLd } from "@/seo/jsonld";

type Props = { params: Promise<{ locale: string }> };

const PATH = "/faq";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.faq);
}

export default async function Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.faq;
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      ld={[faqLd(copy.items)]}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[{ href: "/how-to-play", label: nav.howToPlay }, { href: "/ai-opponents/luna", label: nav.opponents }, { href: "/about", label: nav.about }, { href: "/privacy", label: nav.privacy }]}
    >
      {copy.items.map((item, index) => (
        <details key={item.q} className="faq-item" name="faq" open={index === 0}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </InfoPage>
  );
}
