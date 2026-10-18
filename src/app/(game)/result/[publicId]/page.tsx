import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Leaderboard } from "@/components/Leaderboard";
import { ResultSummary } from "@/components/ResultSummary";
import { ShareActions } from "@/components/ShareActions";
import { StartButton } from "@/components/StartButton";
import { ResultGrid } from "@/core/share/ResultGrid";
import { shareLine } from "@/lib/share-copy";
import { getGameService } from "@/server/container";
import { readPlayerId } from "@/server/http";
import { isPublicId, publicBaseUrl } from "@/server/public-url";
import { getCookieLocale } from "@/i18n/server";
import { translator } from "@/i18n/messages";
import { SiteShell } from "@/components/site/SiteShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!isPublicId(publicId)) notFound();
  const service = await getGameService();
  const [result, owner, viewer] = await Promise.all([service.getResult(publicId), service.getResultOwner(publicId), readPlayerId()]);
  if (!result) notFound();
  if (!viewer || owner !== viewer) redirect(`/share/${publicId}`);
  const locale = await getCookieLocale();
  const t = translator(locale);
  const shareUrl = `${await publicBaseUrl()}/share/${publicId}`;

  return (
    <SiteShell locale={locale} path="/">
      <div className="container result-page">
        <section className="card result-card result" aria-labelledby="result-title">
          <div className="topline">
            <h1 className="eyebrow" id="result-title">
              {result.cleared ? t("挑战完成") : t("挑战结束")}
            </h1>
            <span className="brand">Spot The Difference Game</span>
          </div>
          <ResultSummary result={result} locale={locale} />
          <ResultGrid outcomes={result.outcomes ?? []} title={shareLine(result, locale)} url={shareUrl} />
          <div className="bottom-actions">
            <ShareActions result={result} shareUrl={shareUrl} />
            <StartButton label={t("再玩一次")} replay />
          </div>
        </section>
        <div className="card result-board">
          <Leaderboard editable initialNickname={result.nickname} />
        </div>
      </div>
    </SiteShell>
  );
}
