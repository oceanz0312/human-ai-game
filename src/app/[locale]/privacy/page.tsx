import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { ContactLine } from "@/components/site/ContactLine";
import { resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

type Props = { params: Promise<{ locale: string }> };

const PATH = "/privacy";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.privacy);
}

export default async function Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.privacy;
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      links={[{ href: "/", label: nav.home }, { href: "/terms", label: nav.terms }, { href: "/about", label: nav.about }]}
    >
      <ContactLine lead="Privacy questions or data deletion requests" />
    </InfoPage>
  );
}
