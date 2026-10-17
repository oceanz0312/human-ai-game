import type { Metadata } from "next";
import { HomeRaceAnimation } from "@/components/HomeRaceAnimation";
import { StartButton } from "@/components/StartButton";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { localePath } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { getGame } from "@/games/registry";
import { gameLd, JsonLd, organizationLd, websiteLd } from "@/seo/jsonld";

type Props = { params: Promise<{ locale: string }> };

const resolve = async (params: Props["params"]): Promise<Locale> => {
  const { locale } = await params;
  return isLocale(locale) ? locale : "en";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolve(params);
  const t = getDictionary(locale).home;
  return pageMetadata(locale, "/", t);
}

export default async function HomePage({ params }: Props) {
  const locale = await resolve(params);
  const t = getDictionary(locale).home;
  const { nav } = getPages(locale);
  const links = [
    { href: "/spot-the-difference", label: nav.spot },
    { href: "/how-to-play", label: nav.howToPlay },
    { href: "/human-vs-ai", label: nav.humanVsAi },
    { href: "/faq", label: nav.faq },
  ];
  return (
    <SiteShell locale={locale} path="/">
      <div className="container landing">
      <JsonLd data={[websiteLd(locale), organizationLd(), gameLd(getGame("spot-the-difference")!, locale, t.title, t.description)]} />
      <section className="hero">
        <h1>
          {t.h1[0]}
          <br />
          {t.h1[1]}
        </h1>
        <p>
          {t.lead[0]}
          <br />
          {t.lead[1]}
        </p>
        <HomeRaceAnimation you={t.raceYou} caption={t.raceCaption} ariaLabel={t.raceAria} />
      </section>
      <div className="actions">
        <StartButton label={t.start} busyLabel={t.starting} locale={locale} />
        <p className="footnote">
          <span>{t.footnote[0]}</span>
          <span className="visually-hidden"> · </span>
          <span>{t.footnote[1]}</span>
        </p>
        <nav className="home-links" aria-label={nav.games}>
          {links.map((link) => (
            <Link key={link.href} href={localePath(locale, link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      </div>
    </SiteShell>
  );
}
