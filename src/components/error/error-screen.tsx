import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * The error pages (404, 500): only the status code and an ASCII art, centred
 * in the page column. The code is the h1 (the site's `text-hero` fade at the
 * `figure` size); `label` names the error for screen readers and the tab,
 * and the art is decorative. Plain markup with no server-only imports, so the
 * client error boundaries can use it too.
 */
export function ErrorScreen({
  status,
  label,
  art,
  className,
}: {
  status: number;
  label: string;
  art: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "container-column flex min-h-[60dvh] w-full flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      <h1
        data-enter=""
        className="text-hero pr-[0.08em] text-figure font-semibold tabular-nums"
      >
        {status}
        <span className="sr-only">{` ${label}`}</span>
      </h1>
      <pre
        data-enter=""
        aria-hidden="true"
        style={{ "--i": 1 } as CSSProperties}
        className="mt-10 max-w-full overflow-hidden text-left font-mono text-[min(1rem,2.6vw)] leading-[1.3] text-muted-foreground select-none"
      >
        {art.replace(/^\n+|\s+$/g, "")}
      </pre>
    </div>
  );
}
