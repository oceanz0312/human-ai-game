import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __sfxResetForTests,
  __sfxTestState,
  installAudioUnlockListeners,
  isMuted,
  playSfx,
  setMuted,
  unlockAudioFromGesture,
} from "@/core/fx/sfx";

class MockAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => {
    this.state = "running";
    return Promise.resolve();
  });
  createOscillator = vi.fn(() => ({
    type: "square" as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
  }));
  createBuffer = vi.fn(() => ({}));
  createBufferSource = vi.fn(() => ({
    buffer: null as AudioBuffer | null,
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
  }));
}

describe("SFX unlock", () => {
  beforeEach(() => {
    __sfxResetForTests();
    window.localStorage.clear();
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal(
      "webkitAudioContext",
      MockAudioContext,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not create a context while muted", () => {
    setMuted(true);
    expect(unlockAudioFromGesture()).toBe(false);
    expect(__sfxTestState().hasContext).toBe(false);
  });

  it("creates, resumes, and marks unlocked from a gesture", async () => {
    expect(isMuted()).toBe(false);
    expect(unlockAudioFromGesture()).toBe(true);
    expect(__sfxTestState().hasContext).toBe(true);
    expect(__sfxTestState().contextState).toBe("running");
    expect(__sfxTestState().gestureUnlocked).toBe(true);
  });

  it("installAudioUnlockListeners unlocks on the first pointerup", () => {
    installAudioUnlockListeners();
    window.dispatchEvent(new Event("pointerup"));
    expect(__sfxTestState().gestureUnlocked).toBe(true);
  });

  it("playSfx returns immediately while muted", () => {
    unlockAudioFromGesture();
    setMuted(true);
    expect(() => playSfx("beep")).not.toThrow();
    expect(isMuted()).toBe(true);
  });
});
