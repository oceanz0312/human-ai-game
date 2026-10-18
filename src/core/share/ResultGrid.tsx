"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import { resultGrid, resultGridText, type LevelOutcome } from "@/core/fx/result-grid";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/8bit";

/** Core share kit · Wordle-style grid of the run with a one-tap "copy" (text only, pastes anywhere). */
export function ResultGrid({ outcomes, title, url }: { outcomes: LevelOutcome[]; title: string; url: string }) {
  const t = useT();
  const [copied, setCopied] = useState<boolean | null>(null);
  if (!outcomes.length) return null;
  const legend = t("🟥 你赢 · 🟦 AI 赢 · ⬛ 都没对 · ⬜ AI 未作答");
  async function copy() {
    setCopied(await copyText(resultGridText({ title: "Spot The Difference Game", summary: title, outcomes, url })));
  }
  return (
    <div className="result-grid" data-testid="result-grid">
      <pre className="result-grid-squares" aria-label={legend}>
        {resultGrid(outcomes)}
      </pre>
      <p className="result-grid-legend muted">{legend}</p>
      <Button variant="secondary" onClick={copy} data-testid="copy-grid">
        {copied ? t("战况已复制") : t("复制战况")}
      </Button>
      {copied === false ? <p className="muted" role="status">{t("复制失败，请手动复制地址栏链接")}</p> : null}
    </div>
  );
}
