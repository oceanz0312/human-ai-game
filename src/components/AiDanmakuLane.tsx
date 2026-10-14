"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { DanmakuMessage } from "@/game/danmaku-messages";

/** Danmaku lives in a thin lane above the board; at most two pills at once. */
export const MAX_VISIBLE = 2;

interface AiDanmakuLaneProps {
  messages: DanmakuMessage[];
  replay?: boolean;
  paused?: boolean;
}

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function DanmakuDisplay({
  visible,
  reducedMotion,
}: {
  visible: DanmakuMessage[];
  reducedMotion: boolean;
}) {
  if (visible.length === 0) return null;

  return (
    <div
      className={reducedMotion ? "ai-danmaku ai-danmaku-static" : "ai-danmaku ai-danmaku-motion"}
      aria-live="polite"
      aria-relevant="additions"
      data-testid="ai-danmaku"
    >
      {visible.map((message, index) => (
        <p
          key={`${message.id}-${index}`}
          className="ai-danmaku-item"
          role="status"
          data-lane={index % MAX_VISIBLE}
          style={reducedMotion ? undefined : { animationDelay: `${index * 0.4}s` }}
        >
          {message.text}
        </p>
      ))}
    </div>
  );
}

function DanmakuReplay({ messages, paused }: { messages: DanmakuMessage[]; paused: boolean }) {
  const [visible, setVisible] = useState<DanmakuMessage[]>([]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (paused || cursor >= messages.length) return;
    const delay = cursor === 0 ? 200 : 600;
    const timer = window.setTimeout(() => {
      const next = messages[cursor];
      setVisible((prev) => [...prev, next].slice(-MAX_VISIBLE));
      setCursor((c) => c + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [cursor, messages, paused]);

  return <DanmakuDisplay visible={visible} reducedMotion={false} />;
}

export function AiDanmakuLane({ messages, replay = false, paused = false }: AiDanmakuLaneProps) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  if (messages.length === 0) return null;

  if (paused || reducedMotion || !replay) {
    return <DanmakuDisplay visible={messages.slice(-MAX_VISIBLE)} reducedMotion={reducedMotion} />;
  }

  const replayKey = messages.map((message) => message.id).join("\0");

  return <DanmakuReplay key={replayKey} messages={messages} paused={paused} />;
}
