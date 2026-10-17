import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Leaderboard } from "@/components/Leaderboard";
import { ResultSummary } from "@/components/ResultSummary";
import { ShareActions } from "@/components/ShareActions";
import { StartButton } from "@/components/StartButton";
import { getGameService } from "@/server/container";
import { readPlayerId } from "@/server/http";
import { isPublicId, publicBaseUrl } from "@/server/public-url";
import { getCookieLocale } from "@/i18n/server";
import { translator } from "@/i18n/messages";

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
    <main className="mobile-shell result one-screen">
      <div className="topline">
        <span className="eyebrow">{result.cleared ? t("挑战完成") : t("挑战结束")}</span>
        <span className="brand">HUMAN VS AI</span>
      </div>
      <ResultSummary result={result} locale={locale} />
      <div className="bottom-actions">
        <ShareActions result={result} shareUrl={shareUrl} />
        <StartButton label={t("再玩一次")} replay />
      </div>
      <Leaderboard editable initialNickname={result.nickname} compact />
    </main>
  );
}
