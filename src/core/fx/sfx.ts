/**
 * Core feel kit · 8-bit SFX synthesized live with WebAudio (square / noise, no audio files).
 * Default ON, remembered in localStorage; unlock on the first user gesture (iOS). When muted, only haptics play.
 */
export type SfxName = "tap" | "hit" | "miss" | "win" | "lose" | "beep" | "fight" | "ko";

const STORAGE_KEY = "hai.sfx.muted";
let context: AudioContext | null = null;
let unlockListenersInstalled = false;
/** True after a successful gesture unlock (context running or resumed in that gesture). */
let gestureUnlocked = false;
const listeners = new Set<(muted: boolean) => void>();

export function isMuted() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Private mode: keep the in-memory choice for this page.
  }
  for (const listener of listeners) listener(muted);
}

export function onMutedChange(listener: (muted: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

function getOrCreateContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/** Standard iOS unlock: tiny buffer in the same synchronous gesture turn as resume(). */
export function unlockAudioFromGesture(): boolean {
  if (isMuted()) return false;
  const ctx = getOrCreateContext();
  if (!ctx) return false;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Some browsers reject buffer playback; resume alone may still help.
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
  gestureUnlocked = ctx.state === "running";
  return gestureUnlocked;
}

/** Call from a user gesture (tap / key). Prefer unlockAudioFromGesture in new code. */
export function unlockAudio() {
  unlockAudioFromGesture();
}

/** One-time capture listeners so the first pointerup/click/keydown unlocks audio (covers Start before /play). */
export function installAudioUnlockListeners() {
  if (typeof window === "undefined" || unlockListenersInstalled) return;
  unlockListenersInstalled = true;
  const onGesture = () => {
    if (isMuted()) return;
    if (gestureUnlocked && context?.state === "running") return;
    unlockAudioFromGesture();
  };
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener("pointerup", onGesture, opts);
  window.addEventListener("touchend", onGesture, opts);
  window.addEventListener("click", onGesture, opts);
  window.addEventListener("keydown", onGesture, opts);
}

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number; slideTo?: number };

const SONGS: Record<SfxName, Note[]> = {
  tap: [{ freq: 880, at: 0, dur: 0.03, gain: 0.05 }],
  hit: [
    { freq: 988, at: 0, dur: 0.06 },
    { freq: 1319, at: 0.06, dur: 0.12 },
  ],
  miss: [
    { freq: 220, at: 0, dur: 0.1, type: "sawtooth" },
    { freq: 196, at: 0.13, dur: 0.16, type: "sawtooth" },
  ],
  win: [
    { freq: 523, at: 0, dur: 0.08 },
    { freq: 659, at: 0.08, dur: 0.08 },
    { freq: 784, at: 0.16, dur: 0.08 },
    { freq: 1047, at: 0.24, dur: 0.2 },
  ],
  lose: [
    { freq: 392, at: 0, dur: 0.1 },
    { freq: 330, at: 0.1, dur: 0.1 },
    { freq: 262, at: 0.2, dur: 0.24, slideTo: 196 },
  ],
  beep: [{ freq: 660, at: 0, dur: 0.08 }],
  fight: [{ freq: 1047, at: 0, dur: 0.3, slideTo: 1568 }],
  ko: [
    { freq: 1568, at: 0, dur: 0.05, type: "square" },
    { freq: 120, at: 0.05, dur: 0.25, type: "triangle", slideTo: 60 },
  ],
};

export function playSfx(name: SfxName) {
  if (isMuted()) return;
  const ctx = getOrCreateContext();
  if (!ctx) return;
  if (ctx.state !== "running") {
    void ctx.resume().catch(() => undefined);
    return;
  }
  const start = ctx.currentTime + 0.005;
  for (const note of SONGS[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? "square";
    osc.frequency.setValueAtTime(note.freq, start + note.at);
    if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, start + note.at + note.dur);
    const level = note.gain ?? 0.07;
    gain.gain.setValueAtTime(level, start + note.at);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + note.at);
    osc.stop(start + note.at + note.dur + 0.02);
  }
}

/** Haptics: 20ms on a hit, two 40ms on a miss. Silent where unsupported. */
export function hapticFx(kind: "hit" | "miss" | "tap") {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    navigator.vibrate(kind === "miss" ? [40, 60, 40] : kind === "hit" ? 20 : 10);
  } catch {
    // Not supported.
  }
}

/** @internal test hooks */
export function __sfxTestState() {
  return {
    hasContext: context !== null,
    contextState: context?.state ?? null,
    gestureUnlocked,
    unlockListenersInstalled,
  };
}

/** @internal vitest reset */
export function __sfxResetForTests() {
  context = null;
  gestureUnlocked = false;
  unlockListenersInstalled = false;
}
