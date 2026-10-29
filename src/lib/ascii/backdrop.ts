import { clear, createField, type Field } from "./field";
import { AsciiRenderer } from "./renderer";
import { subscribe } from "./ticker";
import type { Scene } from "./types";

/** Frames per second when calm and when lively: ASCII reads best a little steppy. */
const CALM_FPS = 12;
const LIVELY_FPS = 20;
/** How fast the energy follows the card (seconds): quick to wake, slow to settle. */
const RISE = 0.25;
const FALL = 0.9;

/**
 * Runs a scene on a canvas behind a card, and returns its cleanup.
 *
 * - Animates only while the canvas is on screen (IntersectionObserver) and
 *   the tab is visible, on the shared loop (`ticker.ts`), at 12fps calm and
 *   up to 20fps lively. `isActive()` (hover, focus, a tap) drives the energy.
 * - Sized to the canvas's box at the screen's pixel density (ResizeObserver);
 *   the canvas is positioned by the page, so nothing shifts.
 * - Glyphs take the canvas's CSS `color` and `font-family` (re-read when the
 *   theme class on <html> changes).
 * - With reduced motion: one still frame, redrawn only on resize or theme.
 */
export function mountBackdrop(
  canvas: HTMLCanvasElement,
  scene: Scene,
  isActive: () => boolean,
): () => void {
  let renderer: AsciiRenderer;
  try {
    renderer = new AsciiRenderer(canvas);
  } catch {
    return () => {};
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let field: Field | null = null;
  let onScreen = false;
  let energy = 0;
  let last = 0;
  let lastDraw = 0;
  let pending = 0;
  let tick = 0;
  let tickAt = 0;
  let stop: (() => void) | null = null;
  let disposed = false;

  function readStyle() {
    const style = getComputedStyle(canvas);
    renderer.setColor(style.color);
    return style.fontFamily || "monospace";
  }

  function layout() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) {
      field = null;
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.resize(width, height, dpr, readStyle());
    const { cols, rows, cell } = renderer;
    field = createField(cols, rows, width / height, cell.width, cell.height);
  }

  function render() {
    if (!field) return;
    clear(field);
    scene.draw(field, energy);
    renderer.draw(field, tick, reduce.matches ? 0 : 0.035 + 0.06 * energy);
  }

  function frame(now: number) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const target = isActive() ? 1 : 0;
    energy +=
      (target - energy) * (1 - Math.exp(-dt / (target > energy ? RISE : FALL)));
    pending += dt;
    const interval = 1000 / (CALM_FPS + (LIVELY_FPS - CALM_FPS) * energy);
    if (now - lastDraw < interval - 2) return;
    lastDraw = now;
    if (now - tickAt > 110) {
      tick++;
      tickAt = now;
    }
    scene.step(pending, energy);
    pending = 0;
    render();
  }

  function update() {
    const run = onScreen && !document.hidden && !reduce.matches && !!field;
    if (run && !stop) {
      last = 0;
      stop = subscribe(frame);
    } else if (!run && stop) {
      stop();
      stop = null;
    }
    if (reduce.matches) {
      energy = 0;
      scene.still();
      render();
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    layout();
    if (field && !stop) render();
    update();
  });
  const intersectionObserver = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    update();
  });
  const themeObserver = new MutationObserver(() => {
    readStyle();
    if (!stop) render();
  });

  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  document.addEventListener("visibilitychange", update);
  reduce.addEventListener("change", update);

  // The glyphs are drawn once the monospaced font is ready (it is only used here).
  void document.fonts
    ?.load(`10px ${readStyle()}`)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      layout();
      render();
      update();
    });

  return () => {
    disposed = true;
    stop?.();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", update);
    reduce.removeEventListener("change", update);
    renderer.clear();
  };
}
