import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type Tone = "page" | "surface";

/**
 * A filled pill for stack items and post tags. Text face, sentence case.
 * `tone` is the ground it sits on: on the page it takes the surface fill, on
 * a surface (inside an answer widget) it takes the page colour.
 */
export function Tag({
  className,
  tone = "page",
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-small leading-6 text-foreground",
        tone === "page" ? "bg-surface" : "bg-background",
        className,
      )}
      {...props}
    />
  );
}

/** A wrapping list of tags. */
export function TagList({
  items,
  className,
  label,
  tone,
}: {
  items: string[];
  className?: string;
  /** Accessible name for the list, e.g. "Stack". */
  label?: string;
  tone?: Tone;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li key={item}>
          <Tag tone={tone}>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}
