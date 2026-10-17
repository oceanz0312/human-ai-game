import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartButton } from "@/components/StartButton";
import { shareHeadline } from "@/game/reveal-copy";
import { ResultSummary } from "@/components/ResultSummary";
import { SiteShell } from "@/components/site/SiteShell";
import { getGameService } from "@/server/container";
import { isPublicId, publicBaseUrl } from "@/server/public-url";
import { getCookieLocale } from "@/i18n/server";
import { translator } from "@/i18n/messages";

export const dynamic = "force-dynamic";

async function load(publicId: string) {
  if (!isPublicId(publicId)) return null;
  return (await getGameService()).getResult(publicId);
}

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const result = await load((await params).publicId);
  if (!result) return { title: "HUMAN VS AI" };
  const locale = await getCookieLocale();
  const t = translator(locale);
  const title = `${shareHeadline(result, locale)} · HUMAN VS AI`;
  return {
    metadataBase: new URL(await publicBaseUrl()),
    robots: { index: false, follow: true },
    title,
    description: t("同样的 20 关，你能走到哪里？"),
    openGraph: { title, description: t("同样的 20 关，你能走到哪里？") },
  };
}

export default async function ShareLandingPage({ params }: { params: Promise<{ publicId: string }> }) {
  const result = await load((await params).publicId);
  if (!result) notFound();
  const locale = await getCookieLocale();
  const t = translator(locale);
  const who = result.nickname ?? t("TA");

  return (
    <SiteShell locale={locale} path="/">
      <div className="container share-page">
        <section className="card result-card share-landing" aria-labelledby="share-title">
          <div className="topline">
            <span className="brand">HUMAN VS AI</span>
            <span className="eyebrow">{t("20 关挑战")}</span>
          </div>
          <h1 className="eyebrow share-who" id="share-title">
            {t("{who} 到达了", { who })}
          </h1>
          <ResultSummary
            result={{ ...result, rank: undefined, bestLevel: undefined }}
            locale={locale}
            label={result.cleared ? t("已通关") : t("到达关卡")}
          />
          <div className="bottom-actions">
            <p className="body-text share-copy">{t("同样的 20 关，你能走到哪里？")}</p>
            <StartButton fromShare locale={locale} />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
