import "server-only";
import { cache } from "react";
import { getGameService } from "./container";
import { isPublicId } from "./public-url";

/**
 * One result lookup per request: generateMetadata and the page share this through React cache(), and the lookup itself
 * is a single D1 batch (GameService.getResultWithOwner).
 */
export const loadResultWithOwner = cache(async (publicId: string, fresh: boolean = false) => {
  if (!isPublicId(publicId)) return null;
  return (await getGameService()).getResultWithOwner(publicId, { fresh });
});
