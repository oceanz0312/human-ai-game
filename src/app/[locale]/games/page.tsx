import type { Metadata } from "next";
import { LiveGameCard, PlannedGameCard } from "@/components/hub/GameCard";
import { InfoPage } from "@/components/site/InfoPage";
import { liveGames, plannedGames } from "@/games/registry";
import { resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { itemListLd } from "@/seo/jsonld";

type Props = { params: Promise<{ locale: string }> };
const PATH = "/games";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.games);
}

/** Game index: registry-driven, same cards as the home hub. */
export default async function GamesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages, gameCopy, hub } = getPages(locale);
  const copy = pages.games;
  const games = liveGames();
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      ld={[itemListLd(locale, hub.itemListName, games.map((game) => ({ name: gameCopy[game.slug]?.name ?? game.slug, path: game.landingPath })))]}
      links={[
        { href: "/human-vs-ai", label: nav.humanVsAi },
        { href: "/ai-opponents", label: nav.opponents },
        { href: "/about", label: nav.about },
      ]}
    >
      <div className="game-grid-list" data-testid="game-list">
        {games.map((game) => (
          <LiveGameCard key={game.slug} game={game} locale={locale} />
        ))}
        {plannedGames.map((game) => (
          <PlannedGameCard key={game.slug} game={game} locale={locale} />
        ))}
        <PlannedGameCard game={null} locale={locale} />
      </div>
    </InfoPage>
  );
}
