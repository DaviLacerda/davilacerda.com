import { RssSimpleIcon } from "@phosphor-icons/react/dist/ssr/RssSimple";

import { cn } from "@/lib/utils";
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
      className={cn(
        "inline-flex items-center gap-2 font-medium text-foreground link-underline",
        className,
      )}
    >
      <RssSimpleIcon aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </a>
  );
}
