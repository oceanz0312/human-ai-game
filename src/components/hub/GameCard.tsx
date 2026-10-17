import Link from "next/link";
import { HomeRaceAnimation } from "@/components/HomeRaceAnimation";
import { StartButton } from "@/components/StartButton";
import { aiOpponents, type GameEntry, type PlannedGame } from "@/games/registry";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPages } from "@/i18n/pages";

/** Live registry game: preview frame, badges, tagline, Start + landing link. */
export function LiveGameCard({ game, locale }: { game: GameEntry; locale: Locale }) {
  const { gameCopy, hub, ui } = getPages(locale);
  const home = getDictionary(locale).home;
  const copy = gameCopy[game.slug];
  const model = aiOpponents.find((opponent) => game.opponents.includes(opponent.slug))?.model;
  return (
    <article className="card game-card is-live" data-testid="game-card" data-slug={game.slug}>
      <Link className="game-card-preview" href={localePath(locale, game.landingPath)} tabIndex={-1} aria-hidden>
        <HomeRaceAnimation you={home.raceYou} caption={null} ariaLabel={home.raceAria} />
      </Link>
      <h3 className="game-card-title">
        <Link href={localePath(locale, game.landingPath)}>{copy?.name ?? game.slug}</Link>
      </h3>
      <div className="badges">
        <span className="badge badge-ok">● {ui.live}</span>
        {model ? <span className="badge">{hub.opponent.replace("{model}", model)}</span> : null}
      </div>
      <p className="game-card-text">{copy?.tagline}</p>
      <div className="game-card-actions">
        <StartButton label={hub.start} locale={locale} />
        <Link className="secondary-action" href={localePath(locale, game.landingPath)}>
          {hub.howAndBoard}
        </Link>
      </div>
    </article>
  );
}

/** Greyed placeholder: tentative name, clearly 筹备中, no link and no claims. */
export function PlannedGameCard({ game, locale }: { game: PlannedGame | null; locale: Locale }) {
  const { hub, ui, plannedCopy } = getPages(locale);
  const name = game ? (plannedCopy[game.slug] ?? game.slug) : hub.moreGames;
  return (
    <article className="card game-card is-planned" data-testid="planned-card" aria-label={`${name} · ${ui.inTheWorks}`}>
      <span className="game-card-thumb" aria-hidden>
        {game ? "?" : "+"}
      </span>
      <div>
        <h3 className="game-card-title">{name}</h3>
        <div className="badges">
          <span className="badge">{ui.inTheWorks}</span>
          {game ? <span className="badge">{hub.tentative}</span> : null}
        </div>
        <p className="game-card-text">{game ? hub.plannedNote : hub.moreGamesNote}</p>
      </div>
    </article>
  );
}
