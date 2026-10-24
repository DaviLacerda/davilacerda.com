import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/** Small pill for tech stack items, post tags and statuses. */
export function Tag({
  className,
  tone = "neutral",
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[0.72rem] leading-5 tracking-tight",
        tone === "neutral" && "border-border bg-surface text-muted-foreground",
        tone === "accent" && "border-accent/25 bg-accent-subtle text-accent",
        className,
      )}
      {...props}
    />
  );
}
