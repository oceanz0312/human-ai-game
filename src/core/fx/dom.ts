/**
 * Core feel kit · DOM effects that work on any game's board: pixel sparks + white flash on the chosen
 * element, a short board shake and a freeze frame. Pure CSS animations (steps()), skipped entirely under
 * prefers-reduced-motion.
 */
export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function sparkBurst(target: Element | null, kind: "hit" | "miss", count = 6) {
  if (!target || reducedMotion()) return;
  const host = target as HTMLElement;
  host.classList.remove("fx-flash", "fx-flash-miss");
  void host.offsetWidth;
  host.classList.add(kind === "hit" ? "fx-flash" : "fx-flash-miss");
  const layer = document.createElement("span");
  layer.className = `fx-sparks fx-sparks-${kind}`;
  layer.setAttribute("aria-hidden", "true");
  for (let index = 0; index < count; index += 1) {
    const spark = document.createElement("i");
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.6;
    const distance = 18 + Math.random() * 18;
    spark.style.setProperty("--dx", `${Math.round(Math.cos(angle) * distance)}px`);
    spark.style.setProperty("--dy", `${Math.round(Math.sin(angle) * distance)}px`);
    layer.appendChild(spark);
  }
  host.appendChild(layer);
  window.setTimeout(() => {
    layer.remove();
    host.classList.remove("fx-flash", "fx-flash-miss");
  }, 450);
}

/** 3px shake for 80ms; with a 60ms freeze first on a hit. */
export function shake(target: Element | null, opts: { freezeMs?: number } = {}) {
  if (!target || reducedMotion()) return;
  const host = target as HTMLElement;
  const run = () => {
    host.classList.remove("fx-shake");
    void host.offsetWidth;
    host.classList.add("fx-shake");
    window.setTimeout(() => host.classList.remove("fx-shake"), 120);
  };
  if (opts.freezeMs) window.setTimeout(run, opts.freezeMs);
  else run();
}
