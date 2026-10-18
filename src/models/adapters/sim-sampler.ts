/**
 * Pure, client-safe building blocks of the simulated AI: a seeded PRNG and the timing/accuracy sampler.
 * No config, no secrets: callers pass the band parameters (server: formal curve; browser: quick round).
 */

function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: tiny seeded PRNG, uniform in [0, 1). */
export function seededRandom(seed: string) {
  let state = fnv1a(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MsRange {
  chance: number;
  minMs: number;
  maxMs: number;
}

/** One difficulty band of the simulated AI. Times are measured from the moment the level is shown. */
export interface SimBandParams {
  /** Probability that the AI picks the right cell. */
  accuracy: number;
  /** Median answer time (log-normal). */
  medianMs: number;
  /** Log-normal sigma: 0.35 ≈ two thirds of answers within 0.7–1.4× the median. */
  spread: number;
  /** Floor for regular (non-snap) answers. */
  minMs: number;
  /** "Snap" answers, JEV-like: uniform in [minMs, maxMs] with this chance. Ignores minMs above. */
  snap: MsRange;
  /** Hesitation: with this chance, add uniform [minMs, maxMs] on top. */
  hesitate: MsRange;
}

export interface SimSample {
  correct: boolean;
  thinkMs: number;
  snapped: boolean;
  hesitated: boolean;
  /** Extra uniforms for cosmetic fields (choice, confidence, runner-up): always 4 values. */
  extras: [number, number, number, number];
}

/**
 * Draws one answer. Always consumes the same number of random values in the same order, so a seed maps to one
 * outcome forever (refresh / replay never rerolls).
 */
export function sampleSimAnswer(random: () => number, band: SimBandParams, limitMs: number, maxFractionOfLimit: number): SimSample {
  const correct = random() < band.accuracy;
  const snapRoll = random();
  const snapAt = random();
  const u1 = Math.max(random(), 1e-12);
  const u2 = random();
  const hesitateRoll = random();
  const hesitateAt = random();
  const extras: SimSample["extras"] = [random(), random(), random(), random()];

  const snapped = snapRoll < band.snap.chance;
  const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let ms = snapped ? band.snap.minMs + snapAt * (band.snap.maxMs - band.snap.minMs) : Math.max(band.minMs, band.medianMs * Math.exp(band.spread * gauss));
  const hesitated = hesitateRoll < band.hesitate.chance;
  if (hesitated) ms += band.hesitate.minMs + hesitateAt * (band.hesitate.maxMs - band.hesitate.minMs);
  const thinkMs = Math.round(Math.max(1, Math.min(ms, limitMs * maxFractionOfLimit)));
  return { correct, thinkMs, snapped, hesitated, extras };
}

/** Cosmetic confidence / runner-up probabilities for the reveal heatmap (never sent before lock-in). */
export function cosmeticProbabilities(sample: SimSample, choice: string, correctChoice: string, wrongChoices: string[], hardness: number) {
  const [a, b, c] = sample.extras;
  const confidence = Number((sample.correct ? 0.62 + 0.33 * a * (1 - hardness / 2) : 0.28 + 0.25 * a).toFixed(2));
  const runnerUp = sample.correct ? wrongChoices[Math.floor(b * Math.max(1, wrongChoices.length))] : correctChoice;
  const probabilities: Record<string, number> = { [choice]: confidence };
  if (runnerUp && runnerUp !== choice) probabilities[runnerUp] = Number(Math.max(0.01, (1 - confidence) * (0.5 + c * 0.4)).toFixed(2));
  return { confidence, probabilities };
}
