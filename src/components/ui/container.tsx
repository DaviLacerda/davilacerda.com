import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils";

type ContainerProps<T extends ElementType> = {
  as?: T;
  /** The wide frame (80rem) of the header, the Work split pane and the footer. */
  wide?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/**
 * The page frame with its side gutter (16px on a phone): the reading column
 * (48rem) for Personal and the blog, or with `wide` the 80rem frame shared by
 * the header, the Work split pane and the footer, so their edges line up.
 */
export function Container<T extends ElementType = "div">({
  as,
  wide = false,
  className,
  ...props
}: ContainerProps<T>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      className={cn(wide ? "container-wide" : "container-column", className)}
      {...props}
    />
  );
}
