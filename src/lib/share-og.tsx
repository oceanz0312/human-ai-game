import { ImageResponse } from "next/og";
import { POSTER_PALETTE as P } from "@/lib/pixel-palette";
import { pixelOgFont } from "@/lib/og-pixel-font";
import { accuracy, posterHeadline, posterStats, shareCopy, shareOutcome, type ShareOutcome, type ShareStats } from "@/lib/share-copy";

export const SHARE_OG_SIZE = { width: 1200, height: 630 };

const BADGE: Record<ShareOutcome, string> = { cleared: P.hi, win: P.ok, tie: P.hi, loss: P.ai };

function Bar({ pct, fill }: { pct: number | null; fill: string }) {
  const on = pct == null ? 0 : Math.round(pct / 10);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: 26, height: 40, border: `4px solid ${P.ink}`, background: i < on ? fill : P.paper }} />
      ))}
    </div>
  );
}

/**
 * Pixel-style 1200×630 result card for /share/[publicId]. Latin-only copy (Press Start 2P is embedded; the CJK pixel font is too large for
 * the Worker bundle), so Chinese stays in the page metadata. Accuracy-first; faster-than-AI only when > 0.
 */
export function renderShareOg(result: ShareStats | null) {
  const stats = result ?? { reachedLevel: 1, fasterThanAiCount: 0, cleared: false, played: 0, humanCorrect: 0, aiCorrect: 0 };
  const c = shareCopy("en");
  const outcome = shareOutcome(stats);
  const [l1, l2] = result ? posterHeadline(stats, "en") : ["Spot The Difference Game", "PLAY NOW"];
  const tiles = result ? posterStats(stats, "en") : [];
  const human = accuracy(stats.humanCorrect, stats.played);
  const ai = accuracy(stats.aiCorrect, stats.played);
  const font = "PressStart2P";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: P.paper, color: P.ink, padding: "40px 56px", fontFamily: font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, padding: "0 24px", background: P.ink, color: "#fff", boxShadow: `12px 12px 0 ${P.ink}` }}>
          <span style={{ fontSize: 32 }}>Spot The Difference Game</span>
          <div style={{ display: "flex", gap: 12 }}>
            {[P.human, P.hi, P.ai].map((bg) => (
              <div key={bg} style={{ width: 24, height: 24, background: bg }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 40, paddingTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 16, padding: "10px 12px", border: `4px solid ${P.ink}`, background: P.surface }}>{c.game}</span>
              {result ? <span style={{ fontSize: 16, padding: "10px 12px", border: `4px solid ${P.ink}`, background: BADGE[outcome], boxShadow: `4px 4px 0 ${P.ink}` }}>{c.badge[outcome]}</span> : null}
            </div>
            <span style={{ fontSize: 40, lineHeight: 1.3 }}>{l1}</span>
            <span style={{ fontSize: 40, lineHeight: 1.3, alignSelf: "flex-start", background: P.hi, padding: "6px 12px" }}>{l2}</span>
            <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
              {tiles.map((tile) => (
                <div key={tile.label} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 18px", border: `6px solid ${P.ink}`, background: P.surface, boxShadow: `6px 6px 0 ${P.ink}` }}>
                  <span style={{ fontSize: 14, color: P.muted }}>{tile.label}</span>
                  <span style={{ fontSize: 32 }}>{tile.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26, width: 440, padding: "28px 28px", border: `8px solid ${P.ink}`, background: P.surface, boxShadow: `12px 12px 0 ${P.ink}` }}>
            <span style={{ fontSize: 16, color: P.muted }}>{c.accuracy}</span>
            {(
              [
                [c.you, human, P.human, P.humanText],
                [c.ai, ai, P.ai, P.aiText],
              ] as const
            ).map(([who, pct, fill, text]) => (
              <div key={who} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: text }}>
                  <span style={{ fontSize: 20 }}>{who}</span>
                  <span style={{ fontSize: 28 }}>{pct == null ? "--" : `${pct}%`}</span>
                </div>
                <Bar pct={pct} fill={fill} />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...SHARE_OG_SIZE, fonts: [{ name: font, data: pixelOgFont(), weight: 400, style: "normal" }] },
  );
}
