import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/site/InfoPage";
import { games } from "@/games/registry";
import { localePath, resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

type Props = { params: Promise<{ locale: string }> };
const PATH = "/games";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.games);
}

export default async function GamesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.games;
  const names: Record<string, string> = { "spot-the-difference": nav.spot };
  return (
    <InfoPage locale={locale} path={PATH} eyebrow={copy.eyebrow} h1={copy.h1} intro={copy.intro} links={[{ href: "/human-vs-ai", label: nav.humanVsAi }, { href: "/about", label: nav.about }]}>
      {games.map((game) => (
        <Link key={game.slug} className="info-link" href={localePath(locale, game.landingPath)}>
          {names[game.slug] ?? game.slug} · {game.levels} {locale === "zh" ? "关" : "levels"}
        </Link>
      ))}
      <p className="body-text">{copy.comingSoon}</p>
    </InfoPage>
  );
}
