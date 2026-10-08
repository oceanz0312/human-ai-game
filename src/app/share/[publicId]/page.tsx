import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartButton } from "@/components/StartButton";
import { shareHeadline } from "@/game/reveal-copy";
import { pad2 } from "@/lib/format";
import { getGameService } from "@/server/container";
import { isPublicId } from "@/server/public-url";

export const dynamic = "force-dynamic";

async function load(publicId: string) {
  if (!isPublicId(publicId)) return null;
  return (await getGameService()).getResult(publicId);
}

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const result = await load((await params).publicId);
  if (!result) return { title: "HUMAN / AI" };
  const title = `${shareHeadline(result)} · HUMAN / AI`;
  return { title, description: "同样的 20 关，你能走到哪里？", openGraph: { title, description: "同样的 20 关，你能走到哪里？" } };
}

export default async function ShareLandingPage({ params }: { params: Promise<{ publicId: string }> }) {
  const result = await load((await params).publicId);
  if (!result) notFound();
  const who = result.nickname ?? "TA";

  return (
    <main className="mobile-shell share-landing">
      <div className="topline">
        <span className="brand">HUMAN / AI</span>
        <span className="eyebrow">20 关挑战</span>
      </div>
      <section className="hero-number">
        <p className="eyebrow">{who} 到达了</p>
        <div className="big-number" data-testid="reached-level">
          {pad2(result.reachedLevel)}
        </div>
        <div className="big-label">{result.cleared ? "已通关" : "到达关卡"}</div>
      </section>
      <section className="stats">
        <div className="row">
          <span className="label">比 AI 更快</span>
          <span className="value">
            {result.fasterThanAiCount} <small>关</small>
          </span>
        </div>
      </section>
      <div className="bottom-actions">
        <p className="body-text share-copy">同样的 20 关，你能走到哪里？</p>
        <StartButton fromShare />
      </div>
    </main>
  );
}
