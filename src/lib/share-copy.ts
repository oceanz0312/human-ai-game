import type { Locale } from "@/i18n/config";
import { FALLBACK_MESSAGE_LOCALE } from "@/i18n/messages";
import { pad2 } from "./format";

/**
 * Share copy (poster, OG card, share text) is framed around accuracy: how many settled rounds the player
 * and the AI answered correctly. Counts that are 0 are never bragged about ("比 AI 更快 0 关" can't happen):
 * the faster-than-AI stat is omitted when it is 0, and accuracy is omitted when no round was settled.
 */
export interface ShareStats {
  reachedLevel: number;
  fasterThanAiCount: number;
  cleared: boolean;
  played: number;
  humanCorrect: number;
  aiCorrect: number;
}

export type ShareOutcome = "cleared" | "win" | "tie" | "loss";

export function shareOutcome(s: ShareStats): ShareOutcome {
  if (s.cleared) return "cleared";
  if (s.played <= 0) return "loss";
  if (s.humanCorrect > s.aiCorrect) return "win";
  if (s.humanCorrect === s.aiCorrect) return "tie";
  return "loss";
}

/** Whole-number accuracy in percent, or null when nothing was settled. */
export function accuracy(correct: number, played: number): number | null {
  if (!Number.isFinite(played) || played <= 0) return null;
  return Math.round((Math.max(0, Math.min(correct, played)) / played) * 100);
}

const ZH = {
  outcome: { cleared: ["我通关了", "大家来找茬"], win: ["我比 AI", "更准"], tie: ["我和 AI", "一样准"], loss: ["AI 这局", "更准一点"] },
  badge: { cleared: "通关", win: "胜", tie: "平", loss: "负" },
  game: "大家来找茬",
  accuracy: "准确率",
  you: "你",
  ai: "AI",
  reached: "到达关卡",
  correct: "答对",
  faster: "抢先 AI",
  rounds: "关",
  cta: ["同一套题，", "你能比 AI 更准吗？"],
  scan: "扫码来挑战",
};
const EN = {
  outcome: { cleared: ["I CLEARED", "ALL LEVELS"], win: ["I OUT-SPOTTED", "THE AI"], tie: ["I TIED", "THE AI"], loss: ["THE AI WAS", "SHARPER"] },
  badge: { cleared: "CLEAR", win: "WIN", tie: "TIE", loss: "LOSS" },
  game: "SPOT THE DIFFERENCE",
  accuracy: "ACCURACY",
  you: "YOU",
  ai: "AI",
  reached: "LEVEL",
  correct: "CORRECT",
  faster: "BEAT AI",
  rounds: "",
  cta: ["Same levels.", "Out-spot the AI?"],
  scan: "Scan to play",
};

export const shareCopy = (locale: Locale = FALLBACK_MESSAGE_LOCALE) => (locale === "zh" ? ZH : EN);

/** Single scan hook on the 9:16 poster footer (English only; URL lives in the QR). */
export const posterScanHook = () => "> Out-spot the AI?";

/** Big poster headline: two short lines. */
export function posterHeadline(s: ShareStats, locale: Locale = FALLBACK_MESSAGE_LOCALE): [string, string] {
  const [a, b] = shareCopy(locale).outcome[shareOutcome(s)];
  return [a, b];
}

/** Stat tiles shown under the accuracy block. Correct / faster-than-AI tiles only appear when they are > 0. */
export function posterStats(s: ShareStats, locale: Locale = FALLBACK_MESSAGE_LOCALE): { label: string; value: string; unit?: string }[] {
  const c = shareCopy(locale);
  const tiles: { label: string; value: string; unit?: string }[] = [{ label: c.reached, value: pad2(s.reachedLevel) }];
  if (s.played > 0 && s.humanCorrect > 0) tiles.push({ label: c.correct, value: `${s.humanCorrect}/${s.played}` });
  if (s.fasterThanAiCount > 0) tiles.push({ label: c.faster, value: String(s.fasterThanAiCount), unit: c.rounds || undefined });
  return tiles;
}

/** One-line share title / text, e.g. "我比 AI 更准 · 准确率 67% vs AI 50%". */
export function shareLine(s: ShareStats, locale: Locale = FALLBACK_MESSAGE_LOCALE) {
  const c = shareCopy(locale);
  const [a, b] = posterHeadline(s, locale);
  const head = locale === "zh" && !/[A-Za-z]$/.test(a) ? `${a}${b}` : `${a} ${b}`;
  const human = accuracy(s.humanCorrect, s.played);
  const ai = accuracy(s.aiCorrect, s.played);
  if (human == null || ai == null) return head;
  return `${head} · ${c.accuracy} ${human}% vs AI ${ai}%`;
}

/** Call to action under the poster / share page. */
export const shareCta = (locale: Locale = FALLBACK_MESSAGE_LOCALE) => shareCopy(locale).cta.join(locale === "zh" ? "" : " ");
