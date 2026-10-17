import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { gameLeaderboardPath, getGame } from "@/games/registry";
import Link from "next/link";
import { localePath, resolveLocaleParam } from "@/i18n/config";
import { getModel, modelsForGame } from "@/models/registry";
import { translator } from "@/i18n/messages";
import { displayNickname } from "@/i18n/nickname";
import { fill, getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { getGameService } from "@/server/container";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ ai?: string }> };
const game = getGame("spot-the-difference")!;
const PATH = gameLeaderboardPath(game);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return pageMetadata(locale, PATH, getPages(locale).pages.leaderboard, { image: `/og/${locale}/spot-the-difference.png` });
}

/** Overall board (all opponents) or one opponent's board (`?ai=<slug>`, live models only). */
async function loadTop(modelId: string | null) {
  try {
    const service = await getGameService();
    return modelId ? await service.getModelLeaderboard(modelId, 50) : (await service.getLeaderboard({ viewerPlayerId: null, limit: 50 })).top;
  } catch {
    return [];
  }
}

export default async function LeaderboardPage({ params, searchParams }: Props) {
  const locale = await resolveLocaleParam(params);
  const { nav, pages, gameCopy } = getPages(locale);
  const copy = pages.leaderboard;
  const t = translator(locale);
  const requested = (await searchParams)?.ai;
  const model = requested ? getModel(requested) : undefined;
  const modelId = model?.status === "live" && model.games.includes(game.slug) ? model.id : null;
  const tabs = modelsForGame(game.slug).filter((entry) => entry.status === "live");
  const top = await loadTop(modelId);
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      crumbs={[{ name: nav.games, path: "/games" }, { name: gameCopy[game.slug]?.name ?? nav.spot, path: game.landingPath }, { name: copy.h1, path: PATH }]}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[{ href: game.landingPath, label: nav.spot }, { href: "/human-vs-ai", label: nav.humanVsAi }]}
    >
      <nav className="board-tabs" aria-label={t("排行榜分类")} data-testid="leaderboard-tabs">
        <Link className={`board-tab${modelId ? "" : " is-active"}`} href={localePath(locale, PATH)} aria-current={modelId ? undefined : "page"}>
          {t("总榜")}
        </Link>
        {tabs.map((entry) => (
          <Link
            key={entry.id}
            className={`board-tab${modelId === entry.id ? " is-active" : ""}`}
            href={`${localePath(locale, PATH)}?ai=${entry.slug}`}
            aria-current={modelId === entry.id ? "page" : undefined}
            rel="nofollow"
          >
            {t("对战 {name}", { name: entry.publicName })}
          </Link>
        ))}
      </nav>
      {top.length ? (
        <ol className="board-rows seo-board" data-testid="seo-leaderboard">
          {top.map((row, index) => (
            <li key={index}>
              <span className="rank">{row.rank}</span>
              <span className="name">{displayNickname(row.nickname, t)}</span>
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
