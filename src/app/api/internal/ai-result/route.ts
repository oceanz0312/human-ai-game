import { workerAiResultReportSchema } from "@/server/decisions/contracts";
import { json, readJson } from "@/server/http";
import { isWorkerAuthorized } from "@/server/worker-auth";
import { getGameService } from "@/server/container";

/** Decisions Worker callback: persists the authoritative AI answer after a browser ticket call. */
export async function POST(request: Request) {
  if (!(await isWorkerAuthorized(request, process.env.DECISIONS_WORKER_SHARED_SECRET))) {
    return json({ error: "unauthorized" }, 401);
  }
  const raw = await readJson(request);
  const parsed = workerAiResultReportSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  try {
    const service = await getGameService();
    const outcome = await service.ingestWorkerAiResult({
      roundId: parsed.data.roundId,
      jti: parsed.data.jti,
      result: parsed.data.result,
      wallElapsedMs: parsed.data.wallElapsedMs,
    });
    return json(outcome);
  } catch {
    return json({ error: "internal_error" }, 500);
  }
}
