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
}: {
  html: string;
  className?: string;
  /** Place in the first-paint entrance (`data-enter`), if any. */
  enter?: number;
}) {
  return (
    <div
      {...(enter === undefined
        ? {}
        : {
            "data-enter": "",
            style: { "--i": enter } as CSSProperties,
          })}
      className={cn("markdown", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
