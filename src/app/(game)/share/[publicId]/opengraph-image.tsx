import { getGameService } from "@/server/container";
import { isPublicId } from "@/server/public-url";
import { renderShareOg, SHARE_OG_SIZE } from "@/lib/share-og";

export const size = SHARE_OG_SIZE;
export const contentType = "image/png";
export const alt = "Spot The Difference Game result";

export default async function OpenGraphImage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const result = isPublicId(publicId) ? await (await getGameService()).getResult(publicId) : null;
  return renderShareOg(result);
}
