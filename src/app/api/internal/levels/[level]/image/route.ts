import { getLevelImagePngBytes } from "@/server/level-image-bytes";
import { json } from "@/server/http";
import { isWorkerAuthorized } from "@/server/worker-auth";

/** Decisions Worker only: level PNG via GAME service binding (avoids workers.dev → workers.dev fetches). */
export async function GET(request: Request, { params }: { params: Promise<{ level: string }> }) {
  if (!(await isWorkerAuthorized(request, process.env.DECISIONS_WORKER_SHARED_SECRET))) {
    return json({ error: "unauthorized" }, 401);
  }
  const level = Number((await params).level);
  const bytes = await getLevelImagePngBytes(level);
  if (!bytes) return json({ error: "not_found" }, 404);
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
