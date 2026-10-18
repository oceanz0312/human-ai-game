import "server-only";
import { waitUntil } from "./runtime";

/**
 * Small read-through cache for data that is expensive to fetch from the single-region D1 (see
 * proposals/perf-global-latency-plan.md §1(a)-2). Production uses the Workers Cache API: per data centre, free, TTL
 * bound. Keys carry the deploy's build id, so every deploy starts with fresh keys and old entries simply expire.
 * Never use it for per-player or write-path data (daily play limit, sessions, rounds, players/me).
 */
export interface EdgeCache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): void;
}

/** Returns the cached value for `key`, or runs `load` and stores its result (null/undefined are never stored). */
export async function cached<T>(cache: EdgeCache | null | undefined, key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (!cache) return load();
  const hit = await cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  if (value !== null && value !== undefined) cache.set(key, value, ttlSeconds);
  return value;
}

const KEY_ORIGIN = "https://edge-cache.internal";

/** Workers Cache API backed cache; null outside workerd or when EDGE_CACHE=off (kill switch). */
export function createWorkersEdgeCache(): EdgeCache | null {
  if (process.env.EDGE_CACHE === "off") return null;
  const store = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!store || globalThis.navigator?.userAgent !== "Cloudflare-Workers") return null;
  const request = (key: string) => new Request(`${KEY_ORIGIN}/v1/${encodeURIComponent(process.env.OPEN_NEXT_BUILD_ID ?? "dev")}/${key}`);
  return {
    async get<T>(key: string) {
      try {
        const hit = await store.match(request(key));
        return hit ? ((await hit.json()) as T) : undefined;
      } catch {
        return undefined;
      }
    },
    set(key, value, ttlSeconds) {
      const response = new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${Math.max(1, Math.round(ttlSeconds))}` },
      });
      void waitUntil(store.put(request(key), response).catch(() => undefined));
    },
  };
}

/**
 * Response-level edge cache (Workers Cache API) for expensive, immutable renders such as a finished run's share image.
 * Outside workerd (or EDGE_CACHE=off) it just renders. The response carries a public max-age so browsers and
 * social crawlers can reuse it too.
 */
export async function cachedResponse(key: string, ttlSeconds: number, render: () => Promise<Response>): Promise<Response> {
  const cacheControl = `public, max-age=${ttlSeconds}`;
  const withHeaders = (response: Response) => {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", cacheControl);
    return new Response(response.body, { status: response.status, headers });
  };
  const store = process.env.EDGE_CACHE === "off" ? undefined : (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!store || globalThis.navigator?.userAgent !== "Cloudflare-Workers") return withHeaders(await render());
  const request = new Request(`${KEY_ORIGIN}/v1/${encodeURIComponent(process.env.OPEN_NEXT_BUILD_ID ?? "dev")}/${key}`);
  try {
    const hit = await store.match(request);
    if (hit) return withHeaders(hit);
  } catch {
    // Fall through to render.
  }
  const fresh = withHeaders(await render());
  if (fresh.ok) {
    const bytes = await fresh.arrayBuffer();
    void waitUntil(store.put(request, new Response(bytes, { headers: fresh.headers })).catch(() => undefined));
    return new Response(bytes, { status: fresh.status, headers: fresh.headers });
  }
  return fresh;
}

/** In-memory cache with TTL (tests). */
export function createMemoryEdgeCache(now: () => number = Date.now): EdgeCache & { size(): number } {
  const entries = new Map<string, { value: string; expiresAt: number }>();
  return {
    async get<T>(key: string) {
      const entry = entries.get(key);
      if (!entry || entry.expiresAt <= now()) return undefined;
      return JSON.parse(entry.value) as T;
    },
    set(key, value, ttlSeconds) {
      entries.set(key, { value: JSON.stringify(value), expiresAt: now() + ttlSeconds * 1000 });
    },
    size: () => entries.size,
  };
}

/** TTLs in seconds (plan §1(a)-2). */
export const EDGE_TTL = {
  /** Finished-run facts never change (levels, outcomes, accuracy, owner). */
  resultCore: 86_400,
  /** Rank, best and the owner's nickname change after the run (other runs finish, nickname edits). */
  resultLive: 60,
  /** Level page stats only gate indexing. */
  levelStats: 600,
  /** Public top of the board (leaderboard page; the viewer's own fresh view bypasses it). */
  boardTop: 30,
  /** A finished run's share image. */
  shareImage: 86_400,
} as const;
