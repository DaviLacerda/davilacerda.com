import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cn, isExternalUrl } from "@/lib/utils";

type Variant = "primary" | "quiet" | "raised" | "inverse" | "ghost-inverse";
type Size = "md" | "lg";

const base =
  "pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  /** Ink fill (black in light mode, white in dark): the one action on a screen. */
  primary: "bg-foreground text-background hover:bg-foreground/85",
  /** Surface fill, for secondary actions next to a primary one. */
  quiet: "bg-surface text-foreground hover:bg-surface-strong",
  /** Page fill, for a secondary action that sits on a surface. */
  raised: "bg-background text-foreground hover:bg-surface-strong",
  /** The primary action on the ink panel: page-coloured. */
  inverse: "bg-on-ink text-ink hover:bg-on-ink/85",
  /** A secondary action on the ink panel. */
  "ghost-inverse": "bg-on-ink/12 text-on-ink hover:bg-on-ink/20",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-small",
  lg: "h-12 px-6 text-body",
};

/** Class names for button-styled elements (use on any element). */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  variant?: Variant;
  size?: Size;
};

/**
 * Link styled as a button. Internal paths use next/link; external URLs open in
 * a new tab with `rel="noopener noreferrer"`; mailto:/tel: render a plain <a>.
 */
export function ButtonLink({
  href,
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  const classes = buttonVariants({ variant, size, className });
  if (isExternalUrl(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      />
    );
  }
  if (!href.startsWith("/") && !href.startsWith("#")) {
    return <a href={href} className={classes} {...props} />;
  }
  return <Link href={href} className={classes} {...props} />;
}
