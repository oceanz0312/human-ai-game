import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

/**
 * Player-facing copy for AI outcomes that are not an answer. Error codes never appear in these strings; they live only
 * in the folded "AI 详情" area.
 */
type Kind = "refused" | "timeout" | "busy" | "unreachable" | "off" | "offline";

function kindOf(errorCode: string | null, refused = false): Kind {
  if (refused || errorCode === "refused") return "refused";
  if (errorCode === "ai_timeout" || errorCode === "upstream_timeout") return "timeout";
  if (errorCode === "rate_limited") return "busy";
  if (errorCode === "region_unsupported") return "unreachable";
  if (errorCode === "ai_unconfigured") return "off";
  return "offline";
}

/** One-line timeline / danmaku copy. */
export function aiErrorLine(errorCode: string | null, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  switch (kindOf(errorCode)) {
    case "refused":
      return t("AI 放弃了这一关");
    case "timeout":
      return t("AI 没在时间内作答");
    case "busy":
      return t("AI 太忙了，本关不计 AI 成绩");
    case "unreachable":
      return t("AI 暂时连不上，本关按你的结果算");
    case "off":
      return t("AI 今天休息，本关按你的结果算");
    default:
      return t("AI 掉线了，本关按你的结果算");
  }
}

/** Reveal title when the AI did not answer. */
export function aiErrorRevealTitle(errorCode: string | null, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  switch (kindOf(errorCode)) {
    case "refused":
      return t("AI 放弃了");
    case "timeout":
      return t("AI 超时了");
    case "busy":
      return t("AI 太忙了");
    case "off":
      return t("AI 今天休息");
    default:
      return t("AI 掉线了");
  }
}

/** Reveal hint (no technical detail). */
export function aiErrorRevealHint(errorCode: string | null, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  return kindOf(errorCode) === "busy" ? t("本关不计 AI 成绩") : t("本关按你的结果算");
}

/** Short status tag. */
export function aiErrorTag(errorCode: string | null, refused: boolean, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  switch (kindOf(errorCode, refused)) {
    case "refused":
      return t("AI 放弃");
    case "timeout":
      return t("AI 超时");
    case "busy":
      return t("AI 忙线");
    case "off":
      return t("AI 休息");
    default:
      return t("AI 掉线");
  }
}

/** Back-compat alias used by reveal copy. */
export const aiErrorStatusTag = aiErrorTag;
