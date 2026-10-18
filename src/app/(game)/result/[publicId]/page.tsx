import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Leaderboard } from "@/components/Leaderboard";
import { ResultSummary } from "@/components/ResultSummary";
import { ShareActions } from "@/components/ShareActions";
import { ShareView } from "@/components/ShareView";
import { StartButton } from "@/components/StartButton";
import { ResultGrid } from "@/core/share/ResultGrid";
import { shareLine } from "@/lib/share-copy";
import { getGameService } from "@/server/container";
import { readPlayerId } from "@/server/http";
import { isPublicId, publicBaseUrl } from "@/server/public-url";
import { loadResultWithOwner } from "@/server/result-loader";
import { getCookieLocale } from "@/i18n/server";
import { translator } from "@/i18n/messages";
import { SiteShell } from "@/components/site/SiteShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

/** The board streams in with the page (same response), so the browser does not make a second /api/leaderboard trip. */
async function ResultLeaderboard({ viewer, nickname }: { viewer: string | null; nickname: string | null }) {
  let initialData = null;
  try {
    const board = await (await getGameService()).getLeaderboard({ viewerPlayerId: viewer, limit: 10 });
    initialData = { top: board.top, around: board.around };
  } catch {
    // Fall back to the client fetch.
  }
  return <Leaderboard editable initialNickname={nickname} initialData={initialData} />;
}

export default async function ResultPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!isPublicId(publicId)) notFound();
  const [found, viewer, locale] = await Promise.all([loadResultWithOwner(publicId), readPlayerId(), getCookieLocale()]);
  if (!found) notFound();
  const result = found.view;
  // Not the owner: show the public share view in place (was a 307 to /share that repeated every lookup).
  if (!viewer || found.ownerId !== viewer) return <ShareView result={result} locale={locale} />;
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
          <Suspense fallback={<Leaderboard editable initialNickname={result.nickname} deferInitialLoad />}>
            <ResultLeaderboard viewer={viewer} nickname={result.nickname} />
          </Suspense>
        </div>
      </div>
    </SiteShell>
  );
}
