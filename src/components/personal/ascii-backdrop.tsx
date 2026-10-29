"use client";

import { useEffect, useRef } from "react";

import { mountBackdrop } from "@/lib/ascii/backdrop";
import { scenes } from "@/lib/ascii/scenes";
import type { AsciiScene } from "@/lib/ascii/types";
import { cn } from "@/lib/utils";

/**
 * A procedural ASCII animation behind a card (see `src/lib/ascii`): a canvas
 * that fills its positioned parent, decorative, in the theme's ink at low
 * contrast, under the card's content. Calm by default; `active` (the card is
 * hovered, focused or tapped) makes it lively.
 */
export function AsciiBackdrop({
  scene,
  active,
  className,
}: {
  scene: AsciiScene;
  active: boolean;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    return mountBackdrop(element, scenes[scene](), () => activeRef.current);
  }, [scene]);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      data-active={active || undefined}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 size-full font-mono text-foreground opacity-[0.3] transition-opacity duration-300 ease-out data-active:opacity-[0.5]",
        className,
      )}
    />
  );
}
