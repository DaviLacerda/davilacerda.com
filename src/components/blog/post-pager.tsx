import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
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

/** Previous (older) and next (newer) posts as two rows. Renders nothing for a lone post. */
export function PostPager({ lang, newer, older }: PostPagerProps) {
  if (!newer && !older) return null;
  const dict = getDictionary(lang);

  return (
    <nav aria-label={dict.blog.morePosts}>
      <ul className="-mx-4 sm:-mx-5">
        {older ? (
          <li>
            <PagerLink post={older} label={dict.blog.previousPost} dir="prev" />
          </li>
        ) : null}
        {newer ? (
          <li>
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
  const Icon = dir === "prev" ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <Link
      href={post.url}
      rel={dir}
      className="group flex items-center justify-between gap-6 rounded-surface px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface sm:px-5"
    >
      <span className="min-w-0">
        <span className="block text-small text-muted-foreground">{label}</span>
        <span className="mt-0.5 block text-lead font-medium">{post.title}</span>
      </span>
      <Icon
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:text-foreground",
          dir === "prev"
            ? "order-first group-hover:-translate-x-0.5"
            : "group-hover:translate-x-0.5",
        )}
      />
    </Link>
  );
}
