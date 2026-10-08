import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Leaderboard } from "@/components/Leaderboard";
import { ResultSummary } from "@/components/ResultSummary";
import { ShareActions } from "@/components/ShareActions";
import { StartButton } from "@/components/StartButton";
import { getGameService } from "@/server/container";
import { readPlayerId } from "@/server/http";
import { isPublicId, publicBaseUrl } from "@/server/public-url";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  if (!isPublicId(publicId)) notFound();
  const service = await getGameService();
  const [result, owner, viewer] = await Promise.all([service.getResult(publicId), service.getResultOwner(publicId), readPlayerId()]);
  if (!result) notFound();
  if (!viewer || owner !== viewer) redirect(`/share/${publicId}`);
  const shareUrl = `${await publicBaseUrl()}/share/${publicId}`;

  return (
    <main className="mobile-shell result">
      <div className="topline">
        <span className="eyebrow">{result.cleared ? "挑战完成" : "挑战结束"}</span>
        <span className="brand">HUMAN / AI</span>
      </div>
      <ResultSummary result={result} />
      <div className="bottom-actions">
        <ShareActions result={result} shareUrl={shareUrl} />
        <StartButton label="再玩一次" replay />
      </div>
      <Leaderboard editable initialNickname={result.nickname} />
    </main>
  );
}
