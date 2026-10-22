"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { isMuted, onMutedChange, playSfx, setMuted, unlockAudio } from "./sfx";

/** 🔊 / 🔇 in the game bar. Sound is on by default; the choice persists. */
export function MuteToggle() {
  const t = useT();
  const [muted, setState] = useState(() => (typeof window !== "undefined" ? isMuted() : false));
  useEffect(() => onMutedChange(setState), []);
  return (
    <button
      type="button"
      className="fx-mute"
      data-testid="sfx-toggle"
      aria-pressed={muted}
      aria-label={muted ? t("打开音效") : t("关闭音效")}
      title={muted ? t("打开音效") : t("关闭音效")}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        if (!next) {
          unlockAudio();
          playSfx("tap");
        }
      }}
    >
      <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
