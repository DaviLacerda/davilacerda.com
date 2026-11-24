import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import Link from "next/link";
import type { CSSProperties } from "react";

import { getDictionary, interpolate, type Locale } from "@/i18n";
import { formatDate, toIsoDate } from "@/i18n/format";
import type { PostMeta } from "@/lib/blog";
import { cn } from "@/lib/utils";

/**
 * The newest post, featured on the home page: "New on the blog" in
 * handwriting, the title, one line and the date, beside the post's cover
 * taped to the panel like a print. The whole panel is the link.
 */
export function LatestPostCard({
  post,
  lang,
  className,
}: {
  post: PostMeta;
  lang: Locale;
  className?: string;
}) {
  const dict = getDictionary(lang);
  return (
    <Link
      href={post.url}
      className={cn(
        "group grid pressable-panel gap-8 overflow-hidden rounded-panel bg-surface p-6 transition-colors duration-200 ease-out hover:bg-surface-strong sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-8",
        className,
      )}
      style={{ "--accent": post.accent ?? "currentColor" } as CSSProperties}
    >
      <span className="block">
        <span className="block font-hand text-[1.6rem] leading-none font-semibold text-(--accent)">
          {dict.blog.newPost}
        </span>
        <span className="mt-3 block text-heading font-semibold text-balance">
          {post.title}
        </span>
        <span className="mt-2 block max-w-[52ch] text-muted-foreground">
          {post.description}
        </span>
        <span className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted-foreground">
          <time dateTime={toIsoDate(post.date)}>
            {formatDate(post.date, lang)}
          </time>
          <span>
            {interpolate(dict.blog.readingTime, { minutes: post.readingTime })}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            {dict.blog.readNow}
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          </span>
        </span>
      </span>
      {post.cover ? (
        <span className="relative mx-2 mt-2 block rotate-[1.5deg] rounded-[0.25rem] bg-background p-2.5 pb-3 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(0_0_0/0.25)] transition-transform duration-300 ease-out group-hover:rotate-[0.5deg] sm:mx-0 sm:mt-0">
          <span
            aria-hidden="true"
            className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 -rotate-3 bg-[#e6cf9f]/70 dark:bg-[#c9b07c]/45"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- a small, already optimized WebP */}
          <img
            src={post.cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="block aspect-[4/3] w-full rounded-[0.125rem] object-cover"
          />
        </span>
      ) : null}
    </Link>
  );
}
