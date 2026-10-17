import type { AiEvent, RoundStartLine } from "@/game/contracts";
import { GameError } from "@/server/errors";
import { handle, json, readPlayerId } from "@/server/http";
import { waitUntil } from "@/server/runtime";
import { ServerTiming } from "@/server/server-timing";

const STREAM_LIMIT_MS = 20_000;

/**
 * Sent at first paint of the level image. Marks the round shown and — in server mode — starts the real AI at that
 * same instant, streaming its progress as NDJSON. The stream never carries the AI's cell, probabilities or time.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ roundId: string }> }) {
  const timing = new ServerTiming();
  const routeStart = performance.now();
  return handle(async (service) => {
    const authStart = performance.now();
    const playerId = await readPlayerId();
    timing.mark("auth", authStart, "player-cookie");
    if (!playerId) throw new GameError("not_found");
    const workStart = performance.now();
    const { begun, run } = await service.beginRoundLive((await params).roundId, playerId);
    timing.mark("begin", workStart, "mark-shown-and-start-ai");
    timing.mark("total", routeStart, "post-round-start");
    const serverTiming = timing.headerValue();
    if (!run) return json(begun, 200, serverTiming ? { "Server-Timing": serverTiming } : {});

    void waitUntil(run.done);
    const encoder = new TextEncoder();
    let release = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const write = (line: RoundStartLine) => {
          if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        };
        const close = () => {
          if (closed) return;
          closed = true;
          clearTimeout(timer);
          release();
          try {
            controller.close();
          } catch {
            // already closed by the client
          }
        };
        const timer = setTimeout(close, STREAM_LIMIT_MS);
        write({ type: "begin", begin: begun, serverNow: Date.now() });
        const unsubscribe = run.subscribe((event: AiEvent) => {
          write({ type: "ai", ai: event });
          if (event.event === "answered" || event.event === "error") queueMicrotask(close);
        });
        release = () => unsubscribe();
        if (closed) unsubscribe();
      },
      cancel() {
        release();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        ...(serverTiming ? { "Server-Timing": serverTiming } : {}),
      },
    });
  });
}
