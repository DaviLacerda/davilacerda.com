import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type WorkSectionProps = {
  /** Anchor id; the h2 gets `${id}-title` and labels the landmark. */
  id: string;
  title: string;
  description?: string;
  /** Optional mono label above the title. Use sparingly (TL;DR only). */
  label?: string;
  /**
   * "split": résumé layout, title in a sticky left column, content on the right (lg+).
   * "stack": title block on top, full-width content below.
   */
  layout?: "split" | "stack";
  children: ReactNode;
  /** Full-width content rendered under the split grid (e.g. a stats band). */
  after?: ReactNode;
  className?: string;
};

/**
 * Section shell for the Work page: a hairline rule, an h2 and the content.
 * Every section is a `<section aria-labelledby>` landmark; on small screens
 * both layouts collapse to a single column.
 */
export function WorkSection({
  id,
  title,
  description,
  label,
  layout = "split",
  children,
  after,
  className,
}: WorkSectionProps) {
  const headingId = `${id}-title`;

  const heading = (
    <>
      {label ? <Eyebrow className="mb-5">{label}</Eyebrow> : null}
      <h2 id={headingId} className="font-display text-h2 text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-md text-muted-foreground">{description}</p>
      ) : null}
    </>
  );

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("pb-16 sm:pb-24", className)}
    >
      <Container>
        <div className="border-t border-border pt-10 sm:pt-14">
          {layout === "split" ? (
            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
              <header className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
                {heading}
              </header>
              <div className="min-w-0 lg:col-span-8">{children}</div>
            </div>
          ) : (
            <>
              <header className="max-w-2xl">{heading}</header>
              <div className="mt-10 sm:mt-12">{children}</div>
            </>
          )}
          {after ? <div className="mt-12 sm:mt-16">{after}</div> : null}
        </div>
      </Container>
    </section>
  );
}
