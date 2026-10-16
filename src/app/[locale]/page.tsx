import type { Metadata } from "next";
import { HomeRaceAnimation } from "@/components/HomeRaceAnimation";
import { StartButton } from "@/components/StartButton";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

const resolve = async (params: Props["params"]): Promise<Locale> => {
  const { locale } = await params;
  return isLocale(locale) ? locale : "en";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getDictionary(await resolve(params)).home;
  return { title: t.title, description: t.description };
}

export default async function HomePage({ params }: Props) {
  const locale = await resolve(params);
  const t = getDictionary(locale).home;
  return (
    <main className="mobile-shell landing one-screen">
      <div className="brand">HUMAN / AI</div>
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
      </div>
    </main>
  );
}
