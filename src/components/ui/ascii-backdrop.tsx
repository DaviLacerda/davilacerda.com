"use client";

import { useEffect, useRef } from "react";

import { mountBackdrop } from "@/lib/ascii/backdrop";
import { loadScene } from "@/lib/ascii/scenes";
import type { AsciiScene } from "@/lib/ascii/types";
import { cn } from "@/lib/utils";

/** How long a tap keeps a card lively on a touch screen. */
const TAP_MS = 1600;

/**
 * Follows the card the canvas fills (its parent): lively while it is pointed
 * at (mouse or pen), while something in it has keyboard focus, and for a
 * moment after a tap. Sets `data-active` on the canvas (its opacity) and
 * returns the cleanup.
 */
function followCard(canvas: HTMLCanvasElement, active: { current: boolean }) {
  const card = canvas.parentElement;
  if (!card) return () => {};
  let hovered = false;
  let focused = false;
  let tapped = false;
  let tap: number | undefined;
  const sync = () => {
    active.current = hovered || focused || tapped;
    canvas.toggleAttribute("data-active", active.current);
  };
  const enter = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovered = true;
    sync();
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovered = false;
    sync();
  };
  const up = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return;
    tapped = true;
    window.clearTimeout(tap);
    tap = window.setTimeout(() => {
      tapped = false;
      sync();
    }, TAP_MS);
    sync();
  };
  const focusIn = () => {
    focused = card.matches(":has(:focus-visible)");
    sync();
  };
  const focusOut = (event: FocusEvent) => {
    if (card.contains(event.relatedTarget as Node | null)) return;
    focused = false;
    sync();
  };
  card.addEventListener("pointerenter", enter);
  card.addEventListener("pointerleave", leave);
  card.addEventListener("pointerup", up);
  card.addEventListener("focusin", focusIn);
  card.addEventListener("focusout", focusOut);
  return () => {
    window.clearTimeout(tap);
    card.removeEventListener("pointerenter", enter);
    card.removeEventListener("pointerleave", leave);
    card.removeEventListener("pointerup", up);
    card.removeEventListener("focusin", focusIn);
    card.removeEventListener("focusout", focusOut);
  };
}

/**
 * A procedural ASCII animation behind a card (see `src/lib/ascii`): a canvas
 * that fills its positioned parent (`relative isolate overflow-hidden`),
 * decorative, in the ground's ink at low contrast, under the card's content.
 * Calm by default, lively while the card is hovered, focused or tapped:
 * pass `active` to drive it yourself (the team cards), or leave it out and
 * the canvas follows its parent.
 *
 * - `clear`: keep the glyphs clear of the card's words and pictures (they
 *   fade out around them) and let the scene compose in the space left. The
 *   Work answers use it; the team cards compose from their right edge.
 * - `tone`: the ground, `page` (any page or surface fill, ink glyphs) or
 *   `ink` (an ink panel, page-coloured glyphs).
 */
export function AsciiBackdrop({
  scene,
  active,
  clear = false,
  tone = "page",
  className,
}: {
  scene: AsciiScene;
  active?: boolean;
  clear?: boolean;
  tone?: "page" | "ink";
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(Boolean(active));
  const controlled = active !== undefined;

  useEffect(() => {
    if (controlled) activeRef.current = Boolean(active);
  }, [active, controlled]);

  useEffect(() => {
    const element = canvas.current;
    if (!element || controlled) return;
    return followCard(element, activeRef);
  }, [controlled]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    void loadScene(scene).then((create) => {
      if (cancelled) return;
      cleanup = mountBackdrop(element, create(), () => activeRef.current, {
        clear: clear ? element.parentElement : null,
      });
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [scene, clear]);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      data-active={controlled ? active || undefined : undefined}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 h-full w-full font-mono opacity-[0.3] transition-opacity duration-300 ease-out data-active:opacity-[0.5]",
        tone === "ink" ? "text-on-ink" : "text-foreground",
        className,
      )}
    />
  );
}
