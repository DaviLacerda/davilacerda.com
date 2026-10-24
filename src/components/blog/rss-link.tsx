import { Rss } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { routes } from "@/lib/routes";

/**
 * Link to the locale's RSS feed. A plain <a> on purpose: the feed is a route
 * handler, so next/link must not try to navigate to it client-side.
 */
export function RssLink({
  lang,
  label,
  className,
}: {
  lang: Locale;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={routes.rss(lang)}
      type="application/rss+xml"
      className={buttonVariants({ variant: "outline", size: "sm", className })}
    >
      <Rss aria-hidden="true" className="size-3.5" strokeWidth={2} />
      {label}
    </a>
  );
}
