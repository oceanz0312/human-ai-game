import type { Metadata } from "next";
import Link from "next/link";
import { HomeRaceAnimation } from "@/components/HomeRaceAnimation";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { resolveLocaleParam, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { gameLevelPath, getGame } from "@/games/registry";
import { gameLd } from "@/seo/jsonld";

type Props = { params: Promise<{ locale: string }> };

const PATH = "/spot-the-difference";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.spotTheDifference);
}

/** Game landing for the find-the-difference / spot-the-difference keywords: race animation + Start in the first screen. */
export default async function Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages, gameCopy } = getPages(locale);
  const home = getDictionary(locale).home;
  const copy = pages.spotTheDifference;
  const game = getGame("spot-the-difference")!;
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      crumbs={[{ name: nav.games, path: "/games" }, { name: gameCopy[game.slug]?.name ?? copy.h1, path: PATH }]}
      ld={[gameLd(game, locale, copy.h1, copy.description)]}
      action={<StartButton label={home.start} busyLabel={home.starting} locale={locale} />}
      facts={copy.facts}
      aside={
        <div className="card race-window">
          <div className="vs-panel-bar">
            <span>YOU VS AI</span>
            <span className="vs-panel-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
          <HomeRaceAnimation you={home.raceYou} caption={home.raceCaption} ariaLabel={home.raceAria} />
        </div>
      }
      links={[
        { href: "/how-to-play", label: nav.howToPlay },
        { href: gameLevelPath(game, 1), label: nav.levels },
        { href: "/games/spot-the-difference/leaderboard", label: nav.leaderboard },
        { href: "/find-the-difference", label: nav.find },
        { href: "/human-vs-ai", label: nav.humanVsAi },
        { href: "/ai-opponents/luna", label: nav.opponents },
      ]}
    >
      <h2>{copy.howTitle}</h2>
      <ol className="info-steps">
        {pages.howToPlay.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <h2>{copy.levelsTitle}</h2>
      <nav className="level-chips" aria-label={copy.levelsTitle}>
        {Array.from({ length: game.levels }, (_, i) => i + 1).map((level) => (
          <Link key={level} href={localePath(locale, gameLevelPath(game, level))}>
            {String(level).padStart(2, "0")}
          </Link>
        ))}
      </nav>
    </InfoPage>
  );
}
