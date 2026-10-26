import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import Link from "next/link";
import type { CSSProperties } from "react";

import { profile } from "@/content/profile";
import { getDictionary, interpolate, localeMeta } from "@/i18n";
import { formatDate, toIsoDate } from "@/i18n/format";
import type { PostMeta } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PostHeaderProps = {
  post: PostMeta;
  /** The same post in another locale, if it has been translated. */
  translation?: PostMeta;
};

/** Titles take the title size; long ones step down so they stay in two or three lines. */
function titleClass(title: string) {
  if (title.length <= 44) return "text-title";
  return "text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.03em]";
}

/** Way back to the writing, title, description and byline of an article. */
export function PostHeader({ post, translation }: PostHeaderProps) {
  const lang = post.lang;
  const dict = getDictionary(lang);
  const readingTime = interpolate(dict.blog.readingTime, {
    minutes: post.readingTime,
  });

  return (
    <header>
      <nav aria-label={dict.a11y.breadcrumb}>
        <Link
          href={routes.blog(lang)}
          className="group -ml-1 inline-flex items-center gap-2 rounded-full px-1 py-1 text-small text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground"
        >
          <ArrowLeftIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5"
          />
          {dict.blog.backToBlog}
        </Link>
      </nav>

      <h1
        data-enter=""
        style={{ "--i": 0 } as CSSProperties}
        className={cn("mt-8 text-hero sm:mt-10", titleClass(post.title))}
      >
        {post.title}
      </h1>
      <p
        data-enter=""
        style={{ "--i": 1 } as CSSProperties}
        className="mt-4 max-w-[56ch] text-lead text-muted-foreground"
      >
        {post.description}
      </p>

      <div
        data-enter=""
        style={{ "--i": 2 } as CSSProperties}
        className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-small text-muted-foreground"
      >
        <p>
          <span className="sr-only">{dict.blog.writtenBy} </span>
          <Link
            href={routes.work(lang)}
            rel="author"
            className="font-medium text-foreground link-underline"
          >
            {profile.name}
          </Link>
        </p>
        <p>
          <time dateTime={toIsoDate(post.date)}>
            {formatDate(post.date, lang)}
          </time>
        </p>
        <p>{readingTime}</p>
        {translation ? (
          <p>
            <Link
              href={translation.url}
              hrefLang={localeMeta[translation.lang].hreflang}
              lang={localeMeta[translation.lang].hreflang}
              className="text-foreground link-underline"
            >
              {dict.blog.translationAvailable}
            </Link>
          </p>
        ) : null}
      </div>
    </header>
  );
}
