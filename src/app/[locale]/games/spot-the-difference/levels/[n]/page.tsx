import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/site/InfoPage";
import { StartButton } from "@/components/StartButton";
import { gameLevelPath, getGame } from "@/games/registry";
import { localePath, resolveLocaleParam, type Locale } from "@/i18n/config";
import { fill, getPages } from "@/i18n/pages";
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";
import { pageMetadata } from "@/lib/page-meta";
import { isIndexableLevel, loadLevelStats, percent, seconds } from "@/seo/level-stats";
import { levelTier } from "@/seo/level-tier";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; n: string }> };
const game = getGame("spot-the-difference")!;

function levelVars(n: string) {
  if (!/^\d{1,2}$/.test(n)) return null;
  const level = PUBLIC_LEVELS_V1[Number(n) - 1];
  if (!level) return null;
  return { level, tier: levelTier(level.level), vars: { n: String(level.level), grid: String(level.gridSize), secs: String(level.limitMs / 1000), cells: String(level.gridSize ** 2) } };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const found = levelVars((await params).n);
  if (!found) return {};
  const tier = getPages(locale).pages.level.tiers[found.tier];
  const stats = (await loadLevelStats()).get(found.level.level);
  return pageMetadata(
    locale,
    gameLevelPath(game, found.level.level),
    { title: fill(tier.title, found.vars), description: fill(tier.description, found.vars) },
    { index: isIndexableLevel(stats), image: `/og/${locale}/spot-the-difference.png` },
  );
}

export default async function LevelPage({ params }: Props) {
  const locale: Locale = await resolveLocaleParam(params);
  const found = levelVars((await params).n);
  if (!found) notFound();
  const { level } = found;
  const { nav, pages } = getPages(locale);
  const copy = pages.level;
  const tier = copy.tiers[found.tier];
  const vars = { ...found.vars, tier: tier.name };
  const stats = (await loadLevelStats()).get(level.level);
  const prev = level.level > 1 ? gameLevelPath(game, level.level - 1) : null;
  const next = level.level < game.levels ? gameLevelPath(game, level.level + 1) : null;
  return (
    <InfoPage
      locale={locale}
      path={gameLevelPath(game, level.level)}
      eyebrow={fill(copy.eyebrow, vars)}
      h1={fill(tier.h1, vars)}
      intro={fill(tier.intro, vars)}
      className="level-page"
      crumbs={[{ name: nav.games, path: "/games" }, { name: nav.spot, path: game.landingPath }, { name: fill(copy.crumb, vars), path: gameLevelPath(game, level.level) }]}
      action={<StartButton label={nav.play} locale={locale} />}
      links={[
        ...(prev ? [{ href: prev, label: copy.prev }] : []),
        ...(next ? [{ href: next, label: copy.next }] : []),
        { href: game.landingPath, label: copy.all },
        { href: `${game.basePath}/leaderboard`, label: nav.leaderboard },
      ]}
    >
      <div className="level-split">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="level-thumb" src={level.imageUrl} alt={fill(tier.h1, vars)} width={150} height={150} />
        <dl className="level-stats" data-testid="level-stats">
          {stats && stats.samples > 0 ? (
            <>
              <div className="stat-row"><dt>{copy.runs}</dt><dd><strong>{stats.samples}</strong></dd></div>
              <div className="stat-row"><dt>{copy.humanWin}</dt><dd><strong>{percent(stats.humanWins, stats.samples)}</strong></dd></div>
              <div className="stat-row"><dt>{copy.aiAvg}</dt><dd><strong>{seconds(stats.aiAvgMs)}</strong></dd></div>
              <div className="stat-row"><dt>{copy.aiCorrect}</dt><dd><strong>{percent(stats.aiCorrect, stats.aiAnswered)}</strong></dd></div>
              <div className="stat-row"><dt>{copy.fastest}</dt><dd><strong>{seconds(stats.fastestHumanMs)}</strong></dd></div>
            </>
          ) : (
            <p className="body-text">{copy.noData}</p>
          )}
        </dl>
      </div>
      <p className="body-text level-tip">{fill(tier.tip, vars)}</p>
      <p className="body-text level-nav-hint">
        <Link href={localePath(locale, "/how-to-play")}>{nav.howToPlay}</Link>
      </p>
    </InfoPage>
  );
}
