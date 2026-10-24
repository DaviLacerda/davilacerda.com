import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { getDictionary, type Locale } from "@/i18n";
import type { PostMeta } from "@/lib/blog";
import { cn } from "@/lib/utils";

type PostPagerProps = {
  lang: Locale;
  /** Published after the current post. */
  newer?: PostMeta;
  /** Published before the current post. */
  older?: PostMeta;
};

/** Previous (older) / next (newer) post links. Renders nothing for a lone post. */
export function PostPager({ lang, newer, older }: PostPagerProps) {
  if (!newer && !older) return null;
  const dict = getDictionary(lang);

  return (
    <nav aria-label={dict.blog.morePosts}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {older ? (
          <li>
            <PagerLink post={older} label={dict.blog.previousPost} dir="prev" />
          </li>
        ) : null}
        {newer ? (
          <li className={cn(!older && "sm:col-start-2")}>
            <PagerLink post={newer} label={dict.blog.nextPost} dir="next" />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function PagerLink({
  post,
  label,
  dir,
}: {
  post: PostMeta;
  label: string;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={post.url}
      rel={dir}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-5 transition-colors duration-200 hover:border-border-strong hover:bg-surface",
        dir === "next" && "sm:items-end sm:text-right",
      )}
    >
      <span className="inline-flex items-center gap-2 font-mono text-eyebrow text-muted-foreground uppercase">
        {dir === "prev" ? (
          <Icon
            aria-hidden="true"
            className="size-3.5 transition-transform duration-300 ease-editorial group-hover:-translate-x-0.5"
          />
        ) : null}
        {label}
        {dir === "next" ? (
          <Icon
            aria-hidden="true"
            className="size-3.5 transition-transform duration-300 ease-editorial group-hover:translate-x-0.5"
          />
        ) : null}
      </span>
      <span className="font-display text-xl leading-snug text-foreground transition-colors group-hover:text-accent">
        {post.title}
      </span>
    </Link>
  );
}
