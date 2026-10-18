import type { Page } from "@playwright/test";

/**
 * Installs a DOM probe before the run starts: records when the board becomes playable (first paint of the level)
 * and every text the AI status shows, with performance.now() stamps. Survives SPA navigation within the page.
 */
export async function installPresenceProbe(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __presence: { paintedAt: number | null; statuses: { text: string; at: number }[] } };
    w.__presence = { paintedAt: null, statuses: [] };
    const check = () => {
      const cell = document.querySelector<HTMLButtonElement>('[data-testid="board"] button[aria-label="Row 1, column 1"]');
      if (w.__presence.paintedAt === null && cell && !cell.disabled) w.__presence.paintedAt = performance.now();
      const status = document.querySelector('[data-testid="ai-status"]')?.textContent ?? "";
      const last = w.__presence.statuses.at(-1);
      if (status && status !== last?.text) w.__presence.statuses.push({ text: status, at: performance.now() });
    };
    new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });
}

export async function readPresence(page: Page) {
  return page.evaluate(() => (window as unknown as { __presence: { paintedAt: number | null; statuses: { text: string; at: number }[] } }).__presence);
}

/** ms from first paint to the first status at/after paint that equals `text`. */
export function cueLatency(probe: Awaited<ReturnType<typeof readPresence>>, text: string) {
  if (probe.paintedAt === null) return null;
  const hit = probe.statuses.find((s) => s.text === text && s.at >= probe.paintedAt! - 5);
  return hit ? hit.at - probe.paintedAt : null;
}
