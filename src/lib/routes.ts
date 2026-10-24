import { type Locale } from "@/i18n/config";
import type { TopicId } from "@/lib/work/topics";

/**
 * Single source of truth for internal URLs. Always build links with these
 * helpers so locale prefixes and paths stay consistent across pages, the
 * sitemap, RSS, JSON-LD and llms.txt.
 *
 * Paths are locale-prefixed and have no trailing slash.
 */
export const routes = {
  /** Work tab (home): the guided assistant's greeting, composer and summary. */
  work: (lang: Locale) => `/${lang}`,
  /** One answer of the Work assistant, e.g. `/en/work/experience`. */
  topic: (lang: Locale, topic: TopicId) => `/${lang}/work/${topic}`,
  /**
   * Target of the composer form without JavaScript. `src/proxy.ts` redirects
   * `?q=` to the best-matching topic; the page itself is the "no answer" reply.
   */
  ask: (lang: Locale) => `/${lang}/ask`,
  /** Personal tab. */
  personal: (lang: Locale) => `/${lang}/personal`,
  /** Blog index lives inside the Personal tab. */
  blog: (lang: Locale) => `/${lang}/personal#blog`,
  /** A single post. */
  post: (lang: Locale, slug: string) => `/${lang}/personal/blog/${slug}`,
  /** Per-locale RSS feed. */
  rss: (lang: Locale) => `/${lang}/personal/blog/rss.xml`,
} as const;

/** Tabs shown in the header, in order. See `activeTab()` for the active state. */
export const tabs = [
  { id: "work", href: routes.work },
  { id: "personal", href: routes.personal },
] as const;

export type TabId = (typeof tabs)[number]["id"];

/** Which header tab a pathname belongs to (`/pt-br/personal/blog/x` -> "personal"). */
export function activeTab(pathname: string, lang: Locale): TabId {
  return pathname === routes.personal(lang) ||
    pathname.startsWith(`${routes.personal(lang)}/`)
    ? "personal"
    : "work";
}

/**
 * Swaps the locale prefix of a pathname, keeping the rest of the path.
 * `switchLocalePath("/en/personal", "pt-br")` -> "/pt-br/personal".
 * Blog posts have different slugs per locale; use the post's translation
 * (see `getPostAlternates` in `@/lib/blog`) instead of this for them.
 */
export function switchLocalePath(pathname: string, to: Locale): string {
  const [, , ...rest] = pathname.split("/");
  const tail = rest.join("/");
  return tail ? `/${to}/${tail}` : `/${to}`;
}
