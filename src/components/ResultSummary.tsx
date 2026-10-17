import type { ResultView } from "@/game/contracts";
import type { Locale } from "@/i18n/config";
import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import { pad2 } from "@/lib/format";

type Summary = Pick<ResultView, "reachedLevel" | "cleared" | "played" | "humanCorrect" | "aiCorrect" | "fasterThanAiCount"> &
  Partial<Pick<ResultView, "rank" | "bestLevel">>;

/**
 * Accuracy first: “答对 X/Y 关 · AI 答对 X/Y 关”. The faster-than-AI count is shown only when it is > 0,
 * so a run where the AI was always quicker never reads as “比 AI 更快 0 关”.
 */
export function ResultSummary({ result, locale = FALLBACK_MESSAGE_LOCALE, label }: { result: Summary; locale?: Locale; label?: string }) {
  const t = translator(locale);
  const of = (n: number) => (
    <>
      {n}
      <small> / {result.played}</small>
    </>
  );
  return (
    <>
      <section className="hero-number">
        <div className="big-number num" data-testid="reached-level">
          {pad2(result.reachedLevel)}
        </div>
        <div className="big-label">{label ?? (result.cleared ? t("通关 · 到达关卡") : t("到达关卡"))}</div>
      </section>
      <dl className="stats">
        <div className="row">
          <dt className="label">{t("你答对")}</dt>
          <dd className="value num" data-testid="human-correct">
            {of(result.humanCorrect)} <small>{t("关")}</small>
          </dd>
        </div>
        <div className="row">
          <dt className="label">{t("AI 答对")}</dt>
          <dd className="value num" data-testid="ai-correct">
            {of(result.aiCorrect)} <small>{t("关")}</small>
          </dd>
        </div>
        {result.fasterThanAiCount > 0 ? (
          <div className="row">
            <dt className="label">{t("比 AI 更快")}</dt>
            <dd className="value num" data-testid="faster-count">
              {result.fasterThanAiCount} <small>{t("关")}</small>
            </dd>
          </div>
        ) : null}
        {result.rank != null ? (
          <div className="row">
            <dt className="label">{t("全服排名")}</dt>
            <dd className="value num" data-testid="rank">
              {t("第 {n} 名", { n: result.rank })}
            </dd>
          </div>
        ) : null}
        {result.bestLevel != null ? (
          <div className="row">
            <dt className="label">{t("个人最佳")}</dt>
            <dd className="value num">
              {t("第 {n} 关", { n: result.bestLevel })}
            </dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}
