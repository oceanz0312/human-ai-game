import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

/** Player-facing copy for AI error codes on reveal (no secrets). */
export function aiErrorRevealTitle(errorCode: string | null, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  if (errorCode === "region_unsupported") return t("AI 不可用 · 地区限制");
  return t("AI 掉线 · {code}", { code: errorCode ?? "unknown" });
}

export function aiErrorRevealHint(errorCode: string | null, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  if (errorCode === "region_unsupported") {
    return translator(locale)("OpenAI 不支持从当前 Worker 网络出口地区调用（已尝试固定到美国侧出口）");
  }
  return null;
}

export function aiErrorStatusTag(errorCode: string | null, refused: boolean, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const t = translator(locale);
  if (refused) return t("放弃");
  if (errorCode === "region_unsupported") return t("地区限制");
  return t("掉线");
}
