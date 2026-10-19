import { NextResponse, type NextRequest } from "next/server";
import { resolveSkin } from "@/config/skin-calendar";

/**
 * Seasonal home skin (plan: proposals/seasonal-skin-plan.md, approach B). The home page is prerendered once per skin
 * (/en/skin/<id>); this edge middleware only picks the variant for today's New York date and rewrites "/" to it, so
 * the URL, canonical and indexable HTML stay those of "/" and the response still comes from the static asset cache.
 *
 * Kept on the edge runtime on purpose (`middleware`, not `proxy`): OpenNext runs edge middleware natively on
 * Cloudflare Workers, Node.js `proxy` there is experimental.
 */
export const config = { matcher: ["/", "/skin/:path*"] };

/** Test overrides (?skin= / ?skinDate=) work outside production, or when SKIN_OVERRIDE_ENABLED=1. */
const overridesEnabled = () => process.env.NODE_ENV !== "production" || process.env.SKIN_OVERRIDE_ENABLED === "1";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // Variants are an implementation detail: never reachable (or indexable) under their own URL.
  if (url.pathname !== "/") return NextResponse.redirect(new URL("/", url), 301);

  const query = overridesEnabled() ? { skin: url.searchParams.get("skin"), date: url.searchParams.get("skinDate") } : null;
  const { skin, overridden } = resolveSkin({ now: new Date(), envDate: process.env.SKIN_DATE, override: query });
  const target = url.clone();
  target.pathname = `/en/skin/${skin}`;
  const response = NextResponse.rewrite(target);
  response.headers.set("x-skin", skin);
  if (overridden) {
    // A forced skin must never be cached or indexed.
    response.headers.set("cache-control", "private, no-store");
    response.headers.set("x-robots-tag", "noindex");
  } else {
    // The skin flips at New York midnight: shared caches may keep "/" for an hour at most.
    response.headers.set("cache-control", "public, max-age=0, s-maxage=3600, must-revalidate");
  }
  return response;
}
