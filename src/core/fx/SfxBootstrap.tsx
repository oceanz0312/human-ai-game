"use client";

import { useEffect } from "react";
import { installAudioUnlockListeners } from "./sfx";

/** Registers global gesture unlock once per document (game + marketing layouts). */
export function SfxBootstrap() {
  useEffect(() => {
    installAudioUnlockListeners();
  }, []);
  return null;
}
