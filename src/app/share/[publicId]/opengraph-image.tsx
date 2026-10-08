import { ImageResponse } from "next/og";
import { getGameService } from "@/server/container";
import { isPublicId } from "@/server/public-url";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HUMAN / AI result";

/** Latin-only copy: the bundled OG font has no CJK glyphs, so Chinese stays in the page metadata. */
export default async function OpenGraphImage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const result = isPublicId(publicId) ? await (await getGameService()).getResult(publicId) : null;
  const level = String(result?.reachedLevel ?? 0).padStart(2, "0");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FFFFFF", color: "#111111", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 800, letterSpacing: 5 }}>
          <span>HUMAN / AI</span>
          <span style={{ color: "#777777", fontWeight: 600, letterSpacing: 0 }}>20 LEVELS</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          <span style={{ fontSize: 260, lineHeight: 0.85, fontWeight: 800, letterSpacing: -20 }}>{level}</span>
          <div style={{ display: "flex", flexDirection: "column", paddingBottom: 18, fontSize: 34, color: "#777777" }}>
            <span>{result?.cleared ? "CLEARED" : "LEVEL REACHED"}</span>
            <span style={{ color: "#111111", fontWeight: 700 }}>{`FASTER THAN AI × ${result?.fasterThanAiCount ?? 0}`}</span>
          </div>
        </div>
        <div style={{ display: "flex", height: 2, background: "#EEEEEA" }} />
      </div>
    ),
    size,
  );
}
