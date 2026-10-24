import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { siteConfig } from "@/config/site";

/**
 * tailwind-merge must know about the custom theme keys defined in
 * `src/app/globals.css`, otherwise e.g. `text-display` would be treated as a
 * text color and dropped when merged with `text-foreground`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "lead", "eyebrow"],
      container: ["content", "page", "wide"],
      animate: ["fade-up", "fade-in"],
      ease: ["editorial"],
    },
  },
});

/** Merges class names, resolving Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Absolute URL on the canonical origin. `absoluteUrl("/en")` -> "https://davilacerda.com/en". */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** True for http(s) links that leave the site (used to add target/rel). */
export function isExternalUrl(href: string): boolean {
  return /^https?:\/\//.test(href) && !href.startsWith(siteConfig.url);
}
