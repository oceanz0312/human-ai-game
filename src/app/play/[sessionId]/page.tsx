import type { Metadata } from "next";
import { GameScreen } from "@/components/GameScreen";

export const metadata: Metadata = { robots: { index: false } };

export default async function PlayPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <GameScreen key={sessionId} sessionId={sessionId} />;
}
