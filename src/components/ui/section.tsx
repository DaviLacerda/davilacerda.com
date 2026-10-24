import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type SectionProps = {
  /** Anchor id (also used to label the section for assistive tech). */
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Extra content on the right of the header (e.g. a "View all" link). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Container width for the whole section. */
  size?: "content" | "page" | "wide";
};

/**
 * Standard page section: eyebrow, h2 title, optional description, content.
 * Sections are `<section aria-labelledby>` landmarks with consistent rhythm.
 */
export function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  size = "page",
}: SectionProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("py-16 sm:py-24", className)}
    >
      <Container size={size}>
        <header className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-4">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h2 id={headingId} className="font-display text-h2 text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="text-lead text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
        {children}
      </Container>
    </section>
  );
}
