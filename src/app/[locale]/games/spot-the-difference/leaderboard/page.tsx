import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { gameLeaderboardPath, getGame } from "@/games/registry";
import { resolveLocaleParam } from "@/i18n/config";
import { fill, getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { getGameService } from "@/server/container";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };
const game = getGame("spot-the-difference")!;
const PATH = gameLeaderboardPath(game);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.leaderboard, { image: `/og/${locale}/spot-the-difference.png` });
}

async function loadTop() {
  try {
    return (await (await getGameService()).getLeaderboard({ viewerPlayerId: null, limit: 8 })).top;
  } catch {
    return [];
  }
}

export default async function LeaderboardPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages } = getPages(locale);
  const copy = pages.leaderboard;
  const top = await loadTop();
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[{ href: game.landingPath, label: nav.spot }, { href: "/human-vs-ai", label: nav.humanVsAi }]}
    >
      {top.length ? (
        <ol className="board-rows seo-board" data-testid="seo-leaderboard">
          {top.map((row, index) => (
            <li key={index}>
              <span className="rank">{row.rank}</span>
              <span className="name">{locale === "en" ? row.nickname.replace(/^玩家 /, "Player ") : row.nickname}</span>
              <span className="lvl">{fill(copy.level, { n: String(row.reachedLevel) })}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="body-text">{copy.empty}</p>
      )}
    </InfoPage>
  );
}
