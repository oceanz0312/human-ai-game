import type { Metadata } from "next";
import Link from "next/link";
import { LiveGameCard, PlannedGameCard } from "@/components/hub/GameCard";
import { SiteShell } from "@/components/site/SiteShell";
import { aiOpponents, liveGames, plannedGames } from "@/games/registry";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";
import { faqLd, itemListLd, JsonLd, organizationLd, websiteLd } from "@/seo/jsonld";

type Props = { params: Promise<{ locale: string }> };

const resolve = async (params: Props["params"]): Promise<Locale> => {
  const { locale } = await params;
  return isLocale(locale) ? locale : "en";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolve(params);
  return pageMetadata(locale, "/", getPages(locale).hub);
}

/**
 * Platform hub: every section is driven by src/games/registry.ts.
 * A new live game = registry entry + its pages → it appears here, on /games, in nav, footer, sitemap and the ItemList.
 */
export default async function HomePage({ params }: Props) {
  const locale = await resolve(params);
  const { hub, gameCopy } = getPages(locale);
  const games = liveGames();
  const first = games[0];
  const firstName = first ? (gameCopy[first.slug]?.name ?? first.slug) : "";
  const model = aiOpponents[0]?.model ?? "AI";
  const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

  return (
    <SiteShell locale={locale} path="/">
      <JsonLd
        data={[
          websiteLd(locale),
          organizationLd(),
          itemListLd(
            locale,
            hub.itemListName,
            games.map((game) => ({ name: gameCopy[game.slug]?.name ?? game.slug, path: game.landingPath })),
          ),
          faqLd(hub.faq),
        ]}
      />
      <section className="container hub-hero">
        <div className="hub-hero-copy">
          <div className="badges">
            <span className="badge badge-ok">● {fill(hub.eyebrowLive, { n: games.length })}</span>
            {plannedGames.length ? <span className="badge">{hub.eyebrowSoon}</span> : null}
          </div>
          <h1 className="hub-title">
            <span className="hub-title-vs">
              {hub.h1[0].split(" ").map((word, index) => (
                <span key={word} className={index === 0 ? "is-human" : index === 2 ? "is-ai" : undefined}>
                  {index ? " " : ""}
                  {word}
                </span>
              ))}
            </span>
            <span>{hub.h1[1]}</span>
          </h1>
          <p className="hub-lede">{hub.lede}</p>
          <div className="hub-ctas">
            {first ? (
              <Link className="primary-action btn-lg" href={localePath(locale, first.landingPath)} data-testid="hub-play">
                {fill(hub.playCta, { game: firstName })} ▶
              </Link>
            ) : null}
            <Link className="secondary-action btn-lg" href="#games">
              {hub.allGames}
            </Link>
          </div>
          <ul className="hub-facts">
            {hub.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        <div className="card vs-panel" aria-hidden>
          <div className="vs-panel-bar">
            <span>HUMAN VS AI</span>
            <span className="vs-panel-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="vs-panel-body">
            <div className="vs-fighter">
              <span className="vs-avatar is-you">{hub.vsYou}</span>
              <b>{hub.vsYouLabel}</b>
              <small>{hub.vsYouSub}</small>
            </div>
            <span className="vs-mark">VS</span>
            <div className="vs-fighter">
              <span className="vs-avatar is-ai">AI</span>
              <b>{hub.vsAiLabel}</b>
              <small>{model}</small>
            </div>
          </div>
          <div className="vs-panel-foot">
            <span>{hub.vsFoot}</span>
            <span className="blink">▌</span>
          </div>
        </div>
      </section>

      <section className="container hub-section" id="games" aria-labelledby="games-title">
        <div className="section-head">
          <h2 id="games-title">{hub.gamesTitle}</h2>
          <Link href={localePath(locale, "/games")}>{hub.gamesMore}</Link>
        </div>
        <div className="game-grid-list" data-testid="game-list">
          {games.map((game) => (
            <LiveGameCard key={game.slug} game={game} locale={locale} />
          ))}
          {plannedGames.map((game) => (
            <PlannedGameCard key={game.slug} game={game} locale={locale} />
          ))}
          <PlannedGameCard game={null} locale={locale} />
        </div>
      </section>

      <section className="container hub-section" aria-labelledby="how-title">
        <div className="section-head">
          <h2 id="how-title">{hub.howTitle}</h2>
        </div>
        <ol className="steps">
          {hub.steps.map(([title, text], index) => (
            <li key={title} className="card step">
              <b>{String(index + 1).padStart(2, "0")}</b>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container hub-section" aria-labelledby="faq-title">
        <div className="section-head">
          <h2 id="faq-title">{hub.faqTitle}</h2>
          <Link href={localePath(locale, "/faq")}>{hub.faqMore}</Link>
        </div>
        <div className="faq-list">
          {hub.faq.map((item, index) => (
            <details key={item.q} className="faq-item" open={index === 0}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
