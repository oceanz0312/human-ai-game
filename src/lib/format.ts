export const pad2 = (value: number) => String(value).padStart(2, "0");

export const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

/** Countdown display such as `04.82`, never negative. */
export function countdown(ms: number) {
  const clamped = Math.max(0, ms);
  const whole = Math.floor(clamped / 1000);
  const hundredths = Math.floor((clamped % 1000) / 10);
  return `${pad2(whole)}.${pad2(hundredths)}`;
}
