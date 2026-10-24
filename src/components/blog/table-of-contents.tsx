import { ChevronDown } from "lucide-react";

import type { Heading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type TocProps = { headings: Heading[]; label: string };

/** Minimum number of headings worth an outline. */
const MIN_HEADINGS = 2;

function TocLinks({
  headings,
  variant,
}: {
  headings: Heading[];
  variant: "rail" | "inline";
}) {
  return (
    <ol
      className={cn(
        "text-sm leading-snug",
        variant === "rail" ? "space-y-0.5 border-l border-border" : "space-y-2",
      )}
    >
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={cn(
              "block text-muted-foreground transition-colors duration-200 hover:text-foreground",
              variant === "rail" &&
                "-ml-px border-l border-transparent py-1.5 pl-4 hover:border-accent",
              variant === "rail" && heading.depth === 3 && "pl-7",
              variant === "inline" && heading.depth === 3 && "pl-4",
            )}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Sticky outline for the right margin of a post (wide screens only). */
export function TableOfContentsRail({ headings, label }: TocProps) {
  if (headings.length < MIN_HEADINGS) return null;
  return (
    <nav aria-labelledby="toc-rail-title" className="sticky top-28">
      <p
        id="toc-rail-title"
        className="mb-4 font-mono text-eyebrow text-muted-foreground uppercase"
      >
        {label}
      </p>
      <TocLinks headings={headings} variant="rail" />
    </nav>
  );
}

/** Collapsible outline shown above the post body on smaller screens. No JS. */
export function TableOfContentsDisclosure({
  headings,
  label,
  className,
}: TocProps & { className?: string }) {
  if (headings.length < MIN_HEADINGS) return null;
  return (
    <details
      className={cn(
        "group rounded-2xl border border-border bg-surface/70",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-mono text-eyebrow text-muted-foreground uppercase transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform duration-300 ease-editorial group-open:rotate-180"
        />
      </summary>
      <nav aria-label={label} className="border-t border-border px-5 py-4">
        <TocLinks headings={headings} variant="inline" />
      </nav>
    </details>
  );
}
