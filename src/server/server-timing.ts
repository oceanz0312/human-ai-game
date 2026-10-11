import "server-only";

/** Collects Server-Timing metrics for API responses (visible in DevTools → Network). */
export class ServerTiming {
  private readonly origin = performance.now();
  private readonly entries: string[] = [];

  mark(name: string, startMs: number, description?: string) {
    const dur = Math.max(0, performance.now() - startMs);
    const desc = description ? `;desc="${description.replace(/"/g, "'")}"` : "";
    this.entries.push(`${name};dur=${dur.toFixed(2)}${desc}`);
  }

  markInstant(name: string, description?: string) {
    this.mark(name, this.origin, description);
  }

  headerValue() {
    if (this.entries.length === 0) return null;
    return this.entries.join(", ");
  }
}
