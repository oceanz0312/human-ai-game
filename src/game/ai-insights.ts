import { FALLBACK_MESSAGE_LOCALE, translator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

/** Player-facing helpers for Decisions API probability and timing on the reveal page. */

export interface RankedCandidate {
  id: string;
  probability: number;
}

export interface Hesitation {
  margin: number | null;
  label: string;
  detail: string;
}

export interface TimingTimeline {
  totalMs: number | null;
  modelMs: number | null;
  overheadMs: number | null;
  hasData: boolean;
}

const cellLabel = (id: string, locale: Locale = FALLBACK_MESSAGE_LOCALE) => {
  const match = /^r(\d+)c(\d+)$/.exec(id);
  if (!match) return id;
  return translator(locale)("第 {row} 行第 {col} 列", { row: match[1], col: match[2] });
};

export function formatCellShort(id: string) {
  const match = /^r(\d+)c(\d+)$/.exec(id);
  if (!match) return id;
  return `r${match[1]}c${match[2]}`;
}

export function formatPercent(probability: number) {
  return `${Math.round(probability * 100)}%`;
}

export function rankCandidates(probabilities: Record<string, number> | null | undefined, limit = 3): RankedCandidate[] {
  if (!probabilities) return [];
  return Object.entries(probabilities)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, probability]) => ({ id, probability }));
}

export function describeTopCandidates(probabilities: Record<string, number> | null | undefined, limit = 2): string | null {
  const ranked = rankCandidates(probabilities, limit);
  if (!ranked.length) return null;
  return ranked.map((item) => `${formatCellShort(item.id)} ${formatPercent(item.probability)}`).join(" · ");
}

export function describeTopCandidatesFriendly(probabilities: Record<string, number> | null | undefined, limit = 2, locale: Locale = FALLBACK_MESSAGE_LOCALE): string | null {
  const ranked = rankCandidates(probabilities, limit);
  if (!ranked.length) return null;
  return ranked.map((item) => `${cellLabel(item.id, locale)} ${formatPercent(item.probability)}`).join(translator(locale)("，"));
}

export function hesitationFromProbabilities(probabilities: Record<string, number> | null | undefined, locale: Locale = FALLBACK_MESSAGE_LOCALE): Hesitation {
  const t = translator(locale);
  const ranked = rankCandidates(probabilities, 2);
  if (ranked.length < 2) {
    return { margin: null, label: t("数据不足"), detail: t("未能比较前两名概率") };
  }
  const margin = ranked[0].probability - ranked[1].probability;
  if (margin >= 0.4) return { margin, label: t("相当笃定"), detail: t("前两名相差 {p}", { p: formatPercent(margin) }) };
  if (margin >= 0.15) return { margin, label: t("略有犹豫"), detail: t("前两名相差 {p}", { p: formatPercent(margin) }) };
  return { margin, label: t("非常犹豫"), detail: t("前两名仅差 {p}", { p: formatPercent(margin) }) };
}

export function buildTimingTimeline(totalMs: number | null | undefined, modelMs: number | null | undefined): TimingTimeline {
  if (totalMs == null || modelMs == null || totalMs < 0 || modelMs < 0) {
    return { totalMs: totalMs ?? null, modelMs: modelMs ?? null, overheadMs: null, hasData: false };
  }
  const overheadMs = Math.max(0, totalMs - modelMs);
  return { totalMs, modelMs, overheadMs, hasData: totalMs > 0 };
}

/** Deterministic spread for tests and the local fake AI client. */
export function buildSyntheticProbabilities(choices: string[], choice: string, confidence: number): Record<string, number> {
  const clamped = Math.min(0.99, Math.max(0.05, confidence));
  const others = choices.filter((item) => item !== choice);
  const weights = others.map((_, index) => 1 / (index + 2));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const remaining = 1 - clamped;
  const probabilities: Record<string, number> = { [choice]: clamped };
  others.forEach((id, index) => {
    probabilities[id] = (remaining * weights[index]) / weightSum;
  });
  return probabilities;
}

export function parseStoredProbabilities(raw: string | null | undefined): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export function heatmapAlpha(probability: number, maxProbability: number) {
  if (!Number.isFinite(probability) || maxProbability <= 0) return 0;
  return Math.min(0.72, (probability / maxProbability) * 0.72);
}
