import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * The assistant's "generative UI": a predefined answer panel rendered inside
 * the conversation. A surface one tone step from the page, 20px corners, no
 * outline and no shadow. `data-ui` marks it as an interface fragment for the
 * design tooling (it never wraps the page's h1).
 */
export function Widget({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-ui=""
      className={cn("rounded-surface bg-surface p-6 sm:p-8", className)}
      {...props}
    />
  );
}

/** A label/value list inside a widget: label left, value right, wrapping on a phone. */
export function Facts({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-wrap items-baseline justify-between gap-x-6"
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
