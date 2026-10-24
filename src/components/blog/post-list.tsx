import Link from "next/link";

import { RssLink } from "@/components/blog/rss-link";
import { Reveal } from "@/components/motion/reveal";
import { getDictionary, type Locale } from "@/i18n";
import { formatDate, toIsoDate } from "@/i18n/format";
import type { PostMeta } from "@/lib/blog";

type PostListProps = { posts: PostMeta[]; lang: Locale };

/**
 * The blog index: one row per post, newest first. Title and date share a
 * line, the description sits under it; the whole row is the link and takes
 * the surface fill on hover.
 */
export function PostList({ posts, lang }: PostListProps) {
  const dict = getDictionary(lang);
  if (posts.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-lead">{dict.blog.noPosts}</p>
        <p className="mt-2 text-muted-foreground">{dict.blog.emptyHint}</p>
        <RssLink lang={lang} label={dict.blog.subscribe} className="mt-6" />
      </div>
    );
  }

  return (
    <Reveal as="ol" stagger className="-mx-4 mt-6 sm:-mx-5">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={post.url}
            className="block rounded-surface px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface sm:px-5"
          >
            <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-lead font-medium">{post.title}</span>
              <time
                dateTime={toIsoDate(post.date)}
                className="text-small text-muted-foreground"
              >
                {formatDate(post.date, lang, "short")}
              </time>
            </span>
            <span className="mt-1 block max-w-[62ch] text-muted-foreground">
              {post.description}
            </span>
          </Link>
        </li>
      ))}
    </Reveal>
  );
}
