import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/** Small uppercase mono label above headings ("— EXPERIENCE"). */
export function Eyebrow({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-eyebrow text-muted-foreground uppercase",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="h-px w-6 bg-accent" />
      {children}
    </p>
  );
}
