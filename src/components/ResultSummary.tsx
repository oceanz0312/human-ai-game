import type { ResultView } from "@/game/contracts";
import type { Locale } from "@/i18n/config";
import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import { pad2 } from "@/lib/format";

export function ResultSummary({ result, locale = FALLBACK_MESSAGE_LOCALE }: { result: ResultView; locale?: Locale }) {
  const t = translator(locale);
  const zh = locale === "zh";
  return (
    <>
      <section className="hero-number">
        <div className="big-number" data-testid="reached-level">
          {pad2(result.reachedLevel)}
        </div>
        <div className="big-label">{result.cleared ? t("通关 · 到达关卡") : t("到达关卡")}</div>
      </section>
      <section className="stats">
        <div className="row">
          <span className="label">{t("比 AI 更快")}</span>
          <span className="value" data-testid="faster-count">
            {result.fasterThanAiCount} <small>{t("关")}</small>
          </span>
        </div>
        <div className="row">
          <span className="label">{t("全服排名")}</span>
          <span className="value" data-testid="rank">
            {zh ? (
              <>
                <small>第</small>
                {result.rank} <small>名</small>
              </>
            ) : (
              <>
                <small>#</small>
                {result.rank}
              </>
            )}
          </span>
        </div>
        <div className="row">
          <span className="label">{t("个人最佳")}</span>
          <span className="value">
            {zh ? (
              <>
                <small>第</small>
                {result.bestLevel} <small>关</small>
              </>
            ) : (
              <>
                <small>Lv </small>
                {result.bestLevel}
              </>
            )}
          </span>
        </div>
      </section>
    </>
  );
}
