import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils";

const sizes = {
  /** 42rem: reading width (blog posts, long text). */
  content: "max-w-content",
  /** 70rem: default page width. */
  page: "max-w-page",
  /** 80rem: full-bleed-ish sections. */
  wide: "max-w-wide",
} as const;

type ContainerProps<T extends ElementType> = {
  as?: T;
  size?: keyof typeof sizes;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** Centered column with the site's responsive side gutter. */
export function Container<T extends ElementType = "div">({
  as,
  size = "page",
  className,
  ...props
}: ContainerProps<T>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      className={cn(
        "mx-auto w-full px-[clamp(1.25rem,4vw,2.5rem)]",
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
