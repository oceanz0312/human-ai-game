import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareView } from "@/components/ShareView";
import { shareCta, shareLine } from "@/lib/share-copy";
import { publicBaseUrl } from "@/server/public-url";
import { loadResultWithOwner } from "@/server/result-loader";
import { getCookieLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const found = await loadResultWithOwner((await params).publicId);
  if (!found) return { title: "Spot The Difference Game" };
  const locale = await getCookieLocale();
  const title = `${shareLine(found.view, locale)} · Spot The Difference Game`;
  return {
    metadataBase: new URL(await publicBaseUrl()),
    robots: { index: false, follow: true },
    title,
    description: shareCta(locale),
    openGraph: { title, description: shareCta(locale) },
  };
}

export default async function ShareLandingPage({ params }: { params: Promise<{ publicId: string }> }) {
  const found = await loadResultWithOwner((await params).publicId);
  if (!found) notFound();
  return <ShareView result={found.view} locale={await getCookieLocale()} />;
}
