import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import type { CSSProperties } from "react";

import type { Heading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type TocProps = {
  headings: Heading[];
  label: string;
  className?: string;
  /** Place in the first-paint entrance (`data-enter`), if any. */
  enter?: number;
};

/** Minimum number of headings worth an outline. */
const MIN_HEADINGS = 2;

/**
 * The post's outline as a disclosure: a surface pill that opens to the list
 * of sections. Native <details>, so it works without JS.
 */
export function TableOfContents({
  headings,
  label,
  className,
  enter,
}: TocProps) {
  if (headings.length < MIN_HEADINGS) return null;
  return (
    <nav
      aria-label={label}
      className={className}
      {...(enter === undefined
        ? {}
        : {
            "data-enter": "",
            style: { "--i": enter } as CSSProperties,
          })}
    >
      <details className="group">
        <summary className="inline-flex h-10 pressable cursor-pointer list-none items-center gap-2 rounded-full bg-surface px-4 text-small font-medium transition-colors duration-200 ease-out hover:bg-surface-strong [&::-webkit-details-marker]:hidden">
          {label}
          <CaretDownIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-200 ease-out group-open:rotate-180"
          />
        </summary>
        <ol className="mt-4 space-y-2 pl-4">
          {headings.map((heading) => (
            <li key={heading.id} className={cn(heading.depth === 3 && "pl-4")}>
              <a
                href={`#${heading.id}`}
                className="text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground"
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
