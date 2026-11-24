import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * Renders trusted HTML produced by `renderMarkdown()` / `getPost()` with the
 * `.markdown` typography from globals.css.
 */
export function Prose({
  html,
  className,
  enter,
  accent,
}: {
  html: string;
  className?: string;
  /** The colour of scribbles and handwriting accents (a post's `accent`). */
  accent?: string;
  /** Place in the first-paint entrance (`data-enter`), if any. */
  enter?: number;
}) {
  return (
    <div
      {...(enter === undefined ? {} : { "data-enter": "" })}
      style={
        {
          ...(enter === undefined ? {} : { "--i": enter }),
          ...(accent ? { "--accent": accent } : {}),
        } as CSSProperties
      }
      className={cn("markdown", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
