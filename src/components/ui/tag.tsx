import type { ComponentPropsWithoutRef } from "react";

import { BrandLogo } from "@/components/ui/logo";
import { techLogo, type LogoId } from "@/lib/logos";
import { cn } from "@/lib/utils";

type Tone = "page" | "surface" | "ink";

/**
 * A filled pill for stack items and post tags. Text face, sentence case.
 * `tone` is the ground it sits on: on the page it takes the surface fill, on
 * a surface the page colour, on the ink panel a translucent step of the
 * panel's text colour. With `logo`, the brand's mark sits before the name
 * (decorative: the name is right there).
 */
export function Tag({
  className,
  tone = "page",
  logo,
  children,
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: Tone; logo?: LogoId }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-small leading-6 text-foreground",
        logo && "pl-2.5",
        tone === "page"
          ? "bg-surface"
          : tone === "surface"
            ? "bg-background"
            : "bg-on-ink/12 text-on-ink",
        className,
      )}
      {...props}
    >
      {logo ? <BrandLogo id={logo} className="size-4" /> : null}
      {children}
    </span>
  );
}

/**
 * A wrapping list of tags. With `logos`, technologies that have a bundled
 * logo (see `src/lib/logos/registry.ts`) show it; the rest stay text.
 */
export function TagList({
  items,
  className,
  label,
  tone,
  logos = false,
}: {
  items: readonly string[];
  className?: string;
  /** Accessible name for the list, e.g. "Stack". */
  label?: string;
  tone?: Tone;
  logos?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li key={item}>
          <Tag tone={tone} logo={logos ? techLogo(item) : undefined}>
            {item}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
