import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cn, isExternalUrl } from "@/lib/utils";

type TextLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  /** Show the ↗ arrow (defaults to true for external links). */
  arrow?: boolean;
  /** Visually hidden suffix for external links, e.g. dict.a11y.opensInNewTab. */
  newTabLabel?: string;
};

/**
 * Inline link with the ink underline that turns red on hover. External URLs
 * open in a new tab, get a small arrow and (optionally) a screen-reader-only
 * "opens in a new tab".
 */
export function TextLink({
  href,
  arrow,
  newTabLabel,
  className,
  children,
  ...props
}: TextLinkProps) {
  const external = isExternalUrl(href);
  const showArrow = arrow ?? external;
  const classes = cn(
    "inline-flex items-baseline gap-0.5 text-foreground link-underline",
    className,
  );
  const content = (
    <>
      {children}
      {showArrow ? (
        <ArrowUpRightIcon
          aria-hidden="true"
          className="size-[0.85em] translate-y-[0.08em] self-center text-muted-foreground"
        />
      ) : null}
      {external && newTabLabel ? (
        <span className="sr-only"> ({newTabLabel})</span>
      ) : null}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {content}
      </a>
    );
  }
  if (!href.startsWith("/") && !href.startsWith("#")) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {content}
    </Link>
  );
}
