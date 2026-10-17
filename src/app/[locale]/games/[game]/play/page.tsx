import type { Metadata } from "next";
import { InfoPage } from "@/components/site/InfoPage";
import { Suspense } from "react";
import { OpponentSelect } from "@/core/opponents/OpponentSelect";
import { resolveLocaleParam } from "@/i18n/config";
import { getPages } from "@/i18n/pages";
import { pageMetadata } from "@/lib/page-meta";

import { gamePlayPath } from "@/games/registry";
import { liveGameParams, resolveGameParam } from "@/games/route-game";

type Props = { params: Promise<{ locale: string; game: string }> };

export const generateStaticParams = liveGameParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const PATH = gamePlayPath(await resolveGameParam(params));
  return pageMetadata(locale, PATH, getPages(locale).pages.play, { index: false });
}

export default async function Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const game = await resolveGameParam(params);
  const PATH = gamePlayPath(game);
  const { nav, pages } = getPages(locale);
  const copy = pages.play;
  return (
    <InfoPage
      locale={locale}
      path={PATH}
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      action={
        <Suspense fallback={null}>
          <OpponentSelect game={game.slug} locale={locale} />
        </Suspense>
      }
      links={[{ href: "/how-to-play", label: nav.howToPlay }, { href: game.landingPath, label: nav.spot }]}
    ></InfoPage>
  );
}
