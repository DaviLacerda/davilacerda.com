import { MAX_SECONDS, output, voice, type SfxId } from ".";

/*
 * Plays the team sounds in the browser. One sound at a time: a new one
 * fades the last out first, and leaving a card fades it out. Browsers only
 * let a page make sound after a gesture (a click, a key, a tap; hovering is
 * not one), so the AudioContext is created by `unlockAudio()`, called from
 * the sound toggle's click, or from the first gesture on the page when the
 * toggle was already on (`armUnlock()`).
 */

let context: AudioContext | null = null;
let input: AudioNode | null = null;
let current: GainNode | null = null;
let pending: number | undefined;
let armed = false;

/** Creates or wakes the AudioContext. Call it inside a user gesture. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!context) {
    try {
      context = new AudioContext({ latencyHint: "interactive" });
      input = output(context);
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") void context.resume().catch(() => {});
  return context;
}

/** Unlocks the audio on the page's next gesture (the toggle was left on). */
export function armUnlock() {
  if (armed || context?.state === "running") return;
  armed = true;
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    unlockAudio();
    for (const event of events) window.removeEventListener(event, unlock, true);
    armed = false;
  };
  for (const event of events) window.addEventListener(event, unlock, true);
}

/** Whether the page may start audio now without a new gesture. */
function mayStart() {
  return (
    context?.state === "running" ||
    (typeof navigator !== "undefined" &&
      navigator.userActivation?.hasBeenActive === true)
  );
}

function fadeOut(node: GainNode, seconds: number) {
  if (!context) return;
  const now = context.currentTime;
  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(node.gain.value, now);
  node.gain.linearRampToValueAtTime(0, now + seconds);
  window.setTimeout(() => node.disconnect(), seconds * 1000 + 80);
}

/** Plays a sound now, cutting short the one before. */
export function playSfx(id: SfxId) {
  if (!mayStart()) return;
  const ctx = unlockAudio();
  if (!ctx || !input || ctx.state !== "running") return;
  if (current) fadeOut(current, 0.05);
  const node = voice(ctx, input, id, ctx.currentTime + 0.02);
  current = node;
  window.setTimeout(
    () => {
      node.disconnect();
      if (current === node) current = null;
    },
    (MAX_SECONDS + 0.2) * 1000,
  );
}

/**
 * Plays a sound after a short dwell (120ms), so sweeping the pointer across
 * the cards does not fire every one of them.
 */
export function cueSfx(id: SfxId, delay = 120) {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => playSfx(id), delay);
}

/** Cancels a cued sound and fades out the one playing (150ms). */
export function hushSfx() {
  window.clearTimeout(pending);
  if (current) {
    fadeOut(current, 0.15);
    current = null;
  }
}
