import "server-only";

/** Keeps background work (the AI run) alive after the response is done when running on Cloudflare Workers. */
export async function waitUntil(promise: Promise<unknown>) {
  if (globalThis.navigator?.userAgent !== "Cloudflare-Workers") return;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { ctx } = await getCloudflareContext({ async: true });
    ctx.waitUntil(promise);
  } catch {
    // Outside workerd the promise simply keeps running.
  }
}
