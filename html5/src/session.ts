import { FORMAL_DIFFICULTY, bandForLevel } from "@/config/ai-difficulty";
import { STARTING_LIVES, TOTAL_LEVELS, type RoundReveal } from "@/game/contracts";
import { advanceSession, resolveHumanAnswer, resolveRace } from "@/game/rules";
import { planSimulatedAnswer, type SimulatedPlan } from "@/models/adapters/simulated";
import { HTML5_LEVELS, type Html5Level } from "../generated/catalog";

/**
 * Client-only session for the offline HTML5 package: same rules (rules.ts), same sim-v2 curve
 * (FORMAL_DIFFICULTY + planSimulatedAnswer) as the main site, but no /api, no D1, no daily limit.
 * The answer key ships inside this package by design (portal single-player build only).
 */
export interface Html5Session {
  level: number;
  lives: number;
  fasterThanAiCount: number;
  seed: string;
  ended: boolean;
  cleared: boolean;
}

const SESSION_KEY = "stdh5.session.v1";
const BEST_KEY = "stdh5.best.v1";

const randomSeed = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const levelFor = (level: number): Html5Level => HTML5_LEVELS[level - 1];

export function newSession(): Html5Session {
  return { level: 1, lives: STARTING_LIVES, fasterThanAiCount: 0, seed: randomSeed(), ended: false, cleared: false };
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be blocked inside portal iframes; the game still plays */
  }
}

export const loadSession = () => {
  const s = read<Html5Session>(SESSION_KEY);
  return s && !s.ended && s.level >= 1 && s.level <= TOTAL_LEVELS && s.lives > 0 ? s : null;
};
export const saveSession = (s: Html5Session | null) => write(SESSION_KEY, s && !s.ended ? s : null);

export interface Best { reachedLevel: number; cleared: boolean; fasterThanAiCount: number }
export const loadBest = () => read<Best>(BEST_KEY);
export function recordBest(s: Html5Session) {
  const prev = loadBest();
  const reached = s.cleared ? TOTAL_LEVELS : s.level;
  if (!prev || reached > prev.reachedLevel || (reached === prev.reachedLevel && s.fasterThanAiCount > prev.fasterThanAiCount)) {
    write(BEST_KEY, { reachedLevel: reached, cleared: s.cleared, fasterThanAiCount: s.fasterThanAiCount });
  }
}

export function planAi(session: Html5Session, level: Html5Level): SimulatedPlan {
  const band = { ...bandForLevel(FORMAL_DIFFICULTY, level.level) };
  return planSimulatedAnswer(
    { level: level.level, totalLevels: TOTAL_LEVELS, limitMs: level.limitMs, correctChoice: level.correctChoice, seed: session.seed },
    level.choices,
    band,
    FORMAL_DIFFICULTY.maxFractionOfLimit,
  );
}

/** Settle one level locally. No network tolerance: the clock is the browser's own. */
export function settle(session: Html5Session, level: Html5Level, plan: SimulatedPlan, choice: string | null, elapsedMs: number) {
  const human = resolveHumanAnswer({ choice, correctChoice: level.correctChoice, elapsedMs, limitMs: level.limitMs });
  const race = resolveRace({ humanCorrect: human.correct, humanElapsedMs: human.elapsedMs, aiStatus: "complete", aiCorrect: plan.correct, aiElapsedMs: plan.thinkMs });
  const next = advanceSession({ level: level.level, lives: session.lives, humanStatus: human.status, totalLevels: TOTAL_LEVELS });
  const reveal: RoundReveal = {
    id: `${session.seed}-${level.level}`,
    level: level.level,
    gridSize: level.gridSize,
    imageUrl: level.imageUrl,
    correctChoice: level.correctChoice,
    human: { status: human.status, choice: human.status === "timeout" ? null : choice, elapsedMs: human.elapsedMs },
    ai: { status: "complete", correct: plan.correct, elapsedMs: plan.thinkMs, refused: false, choice: plan.choice, confidence: plan.confidence, probabilities: plan.probabilities, modelElapsedMs: plan.thinkMs, errorCode: null, errorDetail: null },
    winner: race.winner,
    fasterThanAi: race.fasterThanAi,
  };
  const updated: Html5Session = {
    ...session,
    lives: next.lives,
    fasterThanAiCount: session.fasterThanAiCount + (race.fasterThanAi ? 1 : 0),
    ended: next.ended,
    cleared: next.cleared,
    level: next.nextLevel ?? session.level,
  };
  return { reveal, session: updated };
}
