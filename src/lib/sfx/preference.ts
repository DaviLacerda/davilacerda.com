/**
 * Whether the team sounds are on: off until the visitor turns them on, then
 * remembered in localStorage (and kept in step across tabs). Read it with
 * `useSyncExternalStore(subscribeSounds, soundsOn, () => false)`.
 */

const KEY = "team-sounds";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

export function soundsOn(): boolean {
  if (cached === null) {
    try {
      cached = window.localStorage.getItem(KEY) === "on";
    } catch {
      cached = false;
    }
  }
  return cached;
}

export function setSoundsOn(on: boolean) {
  cached = on;
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode or storage blocked: it holds for this page only.
  }
  for (const listener of listeners) listener();
}

export function subscribeSounds(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cached = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
