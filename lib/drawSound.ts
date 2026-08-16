"use client";

/**
 * Every sound here is synthesized on the fly via the Web Audio API - no
 * audio file, no licensed music, nothing to host. Keeps this legally
 * simple and means there's nothing to upload/manage to get suspense
 * sound working.
 *
 * Wrapped in try/catch throughout: browsers can refuse to play audio
 * without a prior user gesture (especially iOS Safari), and a sound
 * effect failing silently is much better than a JS error breaking the
 * draw reveal itself.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", peak = 0.15) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = audioCtx.currentTime + start;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch {
    // audio is a nice-to-have, never worth surfacing an error for
  }
}

/** Short percussive click - the continuous ratchet while a digit is still spinning. */
export function playTick() {
  tone(180, 0, 0.06, "square", 0.08);
}

/** Lower, slightly longer thunk - one per digit locking into place. */
export function playLockThunk() {
  tone(110, 0, 0.12, "square", 0.12);
}

/** Rising four-note major arpeggio - the "you won!" chime. */
export function playRevealWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => tone(freq, i * 0.12, 0.35, "sine", 0.15));
}

/** Gentle descending two-note tone - gets the message across without being a downer. */
export function playRevealLose() {
  [392, 329.63].forEach((freq, i) => tone(freq, i * 0.14, 0.3, "sine", 0.1));
}

/** Neutral "ta-da" for the admin's own draw panel, where there's no winner/loser framing. */
export function playRevealNeutral() {
  [659.25, 987.77].forEach((freq, i) => tone(freq, i * 0.1, 0.3, "sine", 0.13));
}
