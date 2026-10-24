import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cn, isExternalUrl } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-200 ease-editorial active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/85",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  outline:
    "border border-border-strong bg-surface/60 text-foreground hover:border-foreground/40 hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
};

/** Class names for button-styled elements (use on any element). */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
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
