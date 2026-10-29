import { clear, createField, smoothstep, type Field } from "./field";
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
 * The air the glyphs leave around a word or a picture they keep clear of
 * (`clear`): none within NEAR pixels of it, full ink from FAR on.
 */
const NEAR = 4;
const FAR = 16;

export type BackdropOptions = {
  /**
   * Keep the glyphs clear of this element's content (its words, pictures and
   * filled controls): the ink fades out around them, and scenes compose in
   * the space that is left (`field.free`). Usually the card the canvas fills.
   */
  clear?: HTMLElement | null;
};

type Rect = { left: number; top: number; right: number; bottom: number };

const PICTURES = new Set([
  "IMG",
  "SVG",
  "PICTURE",
  "VIDEO",
  "CANVAS",
  "INPUT",
  "TEXTAREA",
]);

/**
 * Where the host's content is, in CSS pixels from the canvas's top left:
 * every line box of its text (so a short heading in a wide block only claims
 * its words), its pictures and icons, and any element with a fill of its own
 * (a pill, a button, a tile). Text hidden for screen readers only is skipped.
 * `inner` is the host's content box: the glyphs stay inside its padding,
 * aligned with the words.
 */
function measureContent(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
): { rects: Rect[]; inner: Rect } {
  const origin = canvas.getBoundingClientRect();
  const frame = host.getBoundingClientRect();
  const pad = getComputedStyle(host);
  const padding = [
    pad.paddingTop,
    pad.paddingRight,
    pad.paddingBottom,
    pad.paddingLeft,
  ].map((value) => parseFloat(value) || 0);
  const [top = 0, right = 0, bottom = 0, left = 0] = padding;
  // A padded card keeps the glyphs inside its padding; an unpadded host (a
  // row on the page) lets them use the whole canvas, which may bleed past it.
  const inner = padding.some(Boolean)
    ? {
        left: frame.left - origin.left + left,
        top: frame.top - origin.top + top,
        right: frame.right - origin.left - right,
        bottom: frame.bottom - origin.top - bottom,
      }
    : { left: 0, top: 0, right: origin.width, bottom: origin.height };
  const rects: Rect[] = [];
  const add = (r: DOMRect) => {
    if (r.width < 1 || r.height < 1) return;
    rects.push({
      left: r.left - origin.left,
      top: r.top - origin.top,
      right: r.right - origin.left,
      bottom: r.bottom - origin.top,
    });
  };
  const range = document.createRange();
  const walker = document.createTreeWalker(
    host,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent?.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
        const element = node as Element;
        if (element === canvas) return NodeFilter.FILTER_REJECT;
        const box = element.getBoundingClientRect();
        // Hidden, or visually hidden (sr-only is a 1px clipped box).
        if (box.width <= 1 && box.height <= 1) return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(element);
        if (style.visibility === "hidden" || style.opacity === "0") {
          return NodeFilter.FILTER_REJECT;
        }
        if (PICTURES.has(element.tagName.toUpperCase())) {
          add(box);
          return NodeFilter.FILTER_REJECT;
        }
        const fill = style.backgroundColor;
        if (fill && fill !== "transparent" && !/,\s*0\)$/.test(fill)) add(box);
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) add(rect);
  }
  return { rects, inner };
}

/** How clear each cell of the grid is (1 clear; 0 on content or outside `inner`). */
function clearance(
  field: Field,
  { rects, inner }: { rects: Rect[]; inner: Rect },
  grid: { x: number; y: number; width: number; height: number },
): Float32Array {
  const { cols, rows } = field;
  const free = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y = grid.y + (r + 0.5) * grid.height;
    if (y < inner.top || y > inner.bottom) continue;
    for (let c = 0; c < cols; c++) {
      const x = grid.x + (c + 0.5) * grid.width;
      if (x < inner.left || x > inner.right) continue;
      let d = Infinity;
      for (const rect of rects) {
        const dx = Math.max(rect.left - x, 0, x - rect.right);
        const dy = Math.max(rect.top - y, 0, y - rect.bottom);
        const dist = dx && dy ? Math.hypot(dx, dy) : dx + dy;
        if (dist < d) d = dist;
        if (d <= NEAR) break;
      }
      free[r * cols + c] = smoothstep(NEAR, FAR, d);
    }
  }
  return free;
}

/**
 * Runs a scene on a canvas behind a card, and returns its cleanup.
 *
 * - Animates only while the canvas is on screen (IntersectionObserver) and
 *   the tab is visible, on the shared loop (`ticker.ts`), at 12fps calm and
 *   up to 20fps lively. `isActive()` (hover, focus, a tap) drives the energy.
 * - Sized to the canvas's box at the screen's pixel density (ResizeObserver);
 *   the canvas is positioned by the page, so nothing shifts. A canvas hidden
 *   with CSS (`display: none`, e.g. on a phone) never starts.
 * - Glyphs take the canvas's CSS `color` and `font-family` (re-read when the
 *   theme class on <html> changes).
 * - With `clear`, the ink fades out around that element's words and pictures
 *   (measured on every resize, when its text changes and when the fonts
 *   arrive), and the scene can compose in the space left (`field.free`).
 * - With reduced motion: one still frame, redrawn only on resize or theme.
 */
export function mountBackdrop(
  canvas: HTMLCanvasElement,
  scene: Scene,
  isActive: () => boolean,
  options: BackdropOptions = {},
): () => void {
  let renderer: AsciiRenderer;
  try {
    renderer = new AsciiRenderer(canvas);
  } catch {
    return () => {};
  }
  const host = options.clear ?? null;
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
  let measureFrame = 0;

  function readStyle() {
    const style = getComputedStyle(canvas);
    renderer.setColor(style.color);
    return style.fontFamily || "monospace";
  }

  /** Where the host's content is: the cells the glyphs keep clear of. */
  function measure() {
    if (!host || !field) return;
    field.free = clearance(field, measureContent(host, canvas), renderer.grid);
    field.revision++;
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
    measure();
  }

  function render() {
    if (!field) return;
    clear(field);
    scene.draw(field, energy);
    const { free, ink } = field;
    if (free) for (let i = 0; i < ink.length; i++) ink[i]! *= free[i]!;
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

  /** Measures again on the next frame (text changed, fonts arrived). */
  function remeasure() {
    if (!host || disposed || measureFrame) return;
    measureFrame = requestAnimationFrame(() => {
      measureFrame = 0;
      if (disposed) return;
      measure();
      if (!stop) render();
    });
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
  const contentObserver = host ? new MutationObserver(remeasure) : null;

  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  contentObserver?.observe(host!, {
    childList: true,
    characterData: true,
    subtree: true,
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
  // The words the glyphs keep clear of settle once the text face has loaded.
  if (host) void document.fonts?.ready.then(remeasure);

  return () => {
    disposed = true;
    stop?.();
    cancelAnimationFrame(measureFrame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    themeObserver.disconnect();
    contentObserver?.disconnect();
    document.removeEventListener("visibilitychange", update);
    reduce.removeEventListener("change", update);
    renderer.clear();
  };
}
