/**
 * One requestAnimationFrame loop for every ASCII backdrop on the page. Each
 * backdrop subscribes only while it is on screen and the tab is visible, and
 * the loop stops when nobody is listening.
 */

type Listener = (now: number) => void;

const listeners = new Set<Listener>();
let frame = 0;

function run(now: number) {
  frame = requestAnimationFrame(run);
  for (const listener of listeners) listener(now);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (!frame) frame = requestAnimationFrame(run);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
