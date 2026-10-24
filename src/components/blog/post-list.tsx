import { ArrowRight, ArrowUpRight, Feather } from "lucide-react";
import Link from "next/link";

import { RssLink } from "@/components/blog/rss-link";
import { Tag } from "@/components/ui/tag";
import { getDictionary, interpolate, type Locale } from "@/i18n";
import { formatDate, toIsoDate } from "@/i18n/format";
import type { PostMeta } from "@/lib/blog";
import { cn } from "@/lib/utils";

/**
 * Stretched link: the title link's ::after covers the whole card, so the card
 * is clickable while the markup keeps a single, well-labelled link. The card
 * shows the focus ring (see `cardFocus`).
 */
const stretchedLink =
  "after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none";
const cardFocus =
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring";

type PostListProps = { posts: PostMeta[]; lang: Locale };

/** Blog index: the latest post as a feature card, older ones as editorial rows. */
export function PostList({ posts, lang }: PostListProps) {
  const [latest, ...older] = posts;
  if (!latest) return <EmptyState lang={lang} />;

  return (
    <div className="space-y-6">
      <FeaturedPost post={latest} lang={lang} />
      {older.length > 0 ? (
        <ol className="border-b border-border">
          {older.map((post) => (
            <PostRow key={post.slug} post={post} lang={lang} />
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function PostTags({ tags, className }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag}>
          <Tag>{tag}</Tag>
        </li>
      ))}
    </ul>
  );
}

function FeaturedPost({ post, lang }: { post: PostMeta; lang: Locale }) {
  const dict = getDictionary(lang);
  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-surface/80 p-6 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] transition-[border-color,box-shadow] duration-300 ease-editorial hover:border-border-strong hover:shadow-[0_18px_40px_-24px_rgb(0_0_0/0.25)] sm:p-10",
        cardFocus,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-accent/10 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
      />
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-eyebrow text-muted-foreground uppercase">
        <span className="text-accent">
          {dict.personal.sections.writing.latest}
        </span>
        <span className="whitespace-nowrap">
          <span aria-hidden="true">· </span>
          <time dateTime={toIsoDate(post.date)}>
            {formatDate(post.date, lang)}
          </time>
        </span>
        <span className="whitespace-nowrap">
          <span aria-hidden="true">· </span>
          {interpolate(dict.blog.readingTime, { minutes: post.readingTime })}
        </span>
      </p>
      <h3 className="mt-6 max-w-3xl font-display text-h2 text-foreground">
        <Link href={post.url} className={stretchedLink}>
          {post.title}
        </Link>
      </h3>
      <p className="mt-4 max-w-2xl text-lead text-muted-foreground">
        {post.description}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <PostTags tags={post.tags} />
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {dict.blog.readPost}
          <ArrowRight className="size-4 transition-transform duration-300 ease-editorial group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}

function PostRow({ post, lang }: { post: PostMeta; lang: Locale }) {
  const dict = getDictionary(lang);
  return (
    <li className="border-t border-border">
      <article
        className={cn(
          "group relative grid gap-x-10 gap-y-3 rounded-xl py-7 sm:grid-cols-[9rem_minmax(0,1fr)_auto]",
          cardFocus,
        )}
      >
        <p className="font-mono text-sm text-muted-foreground sm:pt-1.5">
          <time dateTime={toIsoDate(post.date)}>
            {formatDate(post.date, lang, "short")}
          </time>
          <span className="sm:hidden">
            {" · "}
            {interpolate(dict.blog.minutes, { minutes: post.readingTime })}
          </span>
        </p>
        <div className="min-w-0">
          <h3 className="font-display text-h3 text-foreground transition-colors duration-200 group-hover:text-accent">
            <Link href={post.url} className={stretchedLink}>
              {post.title}
            </Link>
          </h3>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {post.description}
          </p>
          <PostTags tags={post.tags} className="mt-4" />
        </div>
        <p
          aria-hidden="true"
          className="hidden items-center gap-2 font-mono text-sm text-muted-foreground sm:flex sm:self-start sm:pt-1.5"
        >
          {interpolate(dict.blog.minutes, { minutes: post.readingTime })}
          <ArrowUpRight className="size-4 transition-transform duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        </p>
      </article>
    </li>
  );
}

function EmptyState({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center sm:py-20">
      <span className="grid size-12 place-items-center rounded-full border border-border bg-background text-accent">
        <Feather aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-6 max-w-md font-display text-h3 text-foreground">
        {dict.blog.noPosts}
      </p>
      <p className="mt-3 max-w-md text-muted-foreground">
        {dict.blog.emptyHint}
      </p>
      <RssLink lang={lang} label={dict.blog.subscribe} className="mt-8" />
    </div>
  );
}
