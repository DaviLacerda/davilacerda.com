import { Languages } from "lucide-react";
import Link from "next/link";

import { Monogram } from "@/components/layout/monogram";
import { profile } from "@/content/profile";
import { getDictionary, interpolate, localeMeta } from "@/i18n";
import { formatDate, toIsoDate } from "@/i18n/format";
import type { PostMeta } from "@/lib/blog";
import { routes } from "@/lib/routes";

type PostHeaderProps = {
  post: PostMeta;
  /** The same post in another locale, if it has been translated. */
  translation?: PostMeta;
};

/** Breadcrumb, title, description and byline of an article. */
export function PostHeader({ post, translation }: PostHeaderProps) {
  const lang = post.lang;
  const dict = getDictionary(lang);
  const readingTime = interpolate(dict.blog.readingTime, {
    minutes: post.readingTime,
  });

  return (
    <header>
      <nav aria-label={dict.a11y.breadcrumb} className="animate-fade-in">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-eyebrow text-muted-foreground uppercase">
          <li>
            <Link
              href={routes.personal(lang)}
              className="transition-colors hover:text-foreground"
            >
              {dict.nav.personal}
            </Link>
          </li>
          <li aria-hidden="true" className="text-border-strong">
            /
          </li>
          <li>
            <Link
              href={routes.blog(lang)}
              className="transition-colors hover:text-foreground"
            >
              {dict.blog.title}
            </Link>
          </li>
        </ol>
      </nav>

      <h1
        className="mt-8 animate-fade-up font-display text-h1 text-foreground"
        style={{ animationDelay: "60ms" }}
      >
        {post.title}
      </h1>
      <p
        className="mt-6 animate-fade-up text-lead text-muted-foreground"
        style={{ animationDelay: "120ms" }}
      >
        {post.description}
      </p>

      <div
        className="mt-10 flex animate-fade-up flex-wrap items-center justify-between gap-x-6 gap-y-4 border-y border-border py-4"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center gap-3">
          <Monogram />
          <div className="text-sm leading-snug">
            <p className="font-medium text-foreground">
              <Link
                href={routes.work(lang)}
                rel="author"
                className="link-underline"
              >
                {profile.name}
              </Link>
            </p>
            <p className="text-muted-foreground">
              <time dateTime={toIsoDate(post.date)}>
                {formatDate(post.date, lang)}
              </time>
              <span aria-hidden="true"> · </span>
              <span>{readingTime}</span>
            </p>
          </div>
        </div>

        {translation ? (
          <Link
            href={translation.url}
            hrefLang={localeMeta[translation.lang].hreflang}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Languages
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.75}
            />
            {dict.blog.translationAvailable}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
