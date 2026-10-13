"use client";

interface VsRaceBarProps {
  humanLabel?: string;
  humanMs: number | null;
  aiLabel?: string;
  aiMs: number | null;
}

function formatSeconds(ms: number | null) {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

export function VsRaceBar({ humanLabel = "你", humanMs, aiLabel = "AI", aiMs }: VsRaceBarProps) {
  const human = humanMs ?? 0;
  const ai = aiMs ?? 0;
  const total = Math.max(human, ai, 1);
  const humanPct = humanMs != null ? (human / total) * 100 : 0;
  const aiPct = aiMs != null ? (ai / total) * 100 : 0;

  return (
    <div className="vs-race" role="img" aria-label={`${humanLabel} ${formatSeconds(humanMs)}，${aiLabel} ${formatSeconds(aiMs)}`}>
      <div className="vs-race-labels">
        <span>
          {humanLabel} <span className="num">{formatSeconds(humanMs)}</span>
        </span>
        <span>
          {aiLabel} <span className="num">{formatSeconds(aiMs)}</span>
        </span>
      </div>
      <div className="vs-race-track">
        <div className="vs-race-segment human" style={{ width: `${humanPct}%` }} />
        <div className="vs-race-segment ai" style={{ width: `${aiPct}%` }} />
      </div>
    </div>
  );
}
