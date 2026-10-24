import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cn, isExternalUrl } from "@/lib/utils";

type Variant = "primary" | "accent" | "quiet" | "raised";
type Size = "md" | "lg";

const base =
  "pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  /** Ink fill. */
  primary: "bg-foreground text-background hover:bg-foreground/85",
  /** Signal red: the one action on a screen. */
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  /** Surface fill, for secondary actions next to a primary one. */
  quiet: "bg-surface text-foreground hover:bg-surface-strong",
  /** Page fill, for a secondary action that sits on a surface. */
  raised: "bg-background text-foreground hover:bg-surface-strong",
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
