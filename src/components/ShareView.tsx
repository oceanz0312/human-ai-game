import { StartButton } from "@/components/StartButton";
import { ResultSummary } from "@/components/ResultSummary";
import { SiteShell } from "@/components/site/SiteShell";
import type { ResultView } from "@/game/contracts";
import { translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { shareCopy, shareCta } from "@/lib/share-copy";

/** The public share landing (used by /share/[id], and by /result/[id] when the viewer is not the run's owner). */
export function ShareView({ result, locale }: { result: ResultView; locale: Locale }) {
  const t = translator(locale);
  const who = result.nickname ?? t("TA");
  return (
    <SiteShell locale={locale} path="/">
      <div className="container share-page">
        <section className="card result-card share-landing" aria-labelledby="share-title">
          <div className="topline">
            <span className="brand">Spot The Difference Game</span>
            <span className="eyebrow">{shareCopy(locale).game}</span>
          </div>
          <h1 className="eyebrow share-who" id="share-title">
            {t("{who} 到达了", { who })}
          </h1>
          <ResultSummary
            result={{ ...result, rank: undefined, bestLevel: undefined }}
            locale={locale}
            label={result.cleared ? t("已通关") : t("到达关卡")}
          />
          <div className="bottom-actions">
            <p className="body-text share-copy">{shareCta(locale)}</p>
            <StartButton fromShare locale={locale} />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
