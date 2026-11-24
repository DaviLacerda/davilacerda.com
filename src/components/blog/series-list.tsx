import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import Link from "next/link";
import type { CSSProperties } from "react";

import {
  series as allSeries,
  type Series,
  type SeriesId,
} from "@/content/series";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { getAllPosts } from "@/lib/blog";
import { cn } from "@/lib/utils";

/**
 * Every part of a blog series, in order: the published ones as links (the
 * one being read marked "you are here"), then the ones still to come, muted.
 * At the foot of each part, and on the page of the project it is about.
 */
export function SeriesList({
  id,
  lang,
  current,
  accent,
  title = true,
  className,
}: {
  id: SeriesId;
  lang: Locale;
  /** The `translationKey` of the part being read. */
  current?: string;
  accent?: string;
  /** Show the series' name in handwriting above the list. */
  title?: boolean;
  className?: string;
}) {
  const dict = getDictionary(lang);
  const series: Series = allSeries[id];
  const color = accent ?? series.accent;
  const published = getAllPosts(lang)
    .filter((post) => post.series === id)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <nav
      aria-label={t(series.name, lang)}
      className={cn("rounded-panel bg-surface p-3 sm:p-4", className)}
      style={
        {
          "--accent": color ?? "var(--foreground)",
          "--on-accent": color ? "#fff" : "var(--background)",
        } as CSSProperties
      }
    >
      {title ? (
        <p className="px-3 pt-2 pb-3 font-hand text-[1.6rem] leading-none font-semibold text-(--accent)">
          {t(series.name, lang)}
        </p>
      ) : null}
      <ol className="grid gap-1">
        {published.map((post, i) => {
          const here = post.translationKey === current;
          const body = (
            <>
              <Number n={i + 1} active={here} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-balance">
                  {post.title}
                </span>
                <span className="mt-0.5 block text-small text-muted-foreground">
                  {here ? dict.blog.series.youAreHere : post.description}
                </span>
              </span>
              {here ? null : (
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                />
              )}
            </>
          );
          return (
            <li key={post.slug}>
              {here ? (
                <span
                  aria-current="page"
                  className="flex items-center gap-4 rounded-2xl bg-background p-3"
                >
                  {body}
                </span>
              ) : (
                <Link
                  href={post.url}
                  className="group flex items-center gap-4 rounded-2xl p-3 transition-colors duration-200 ease-out hover:bg-background"
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
        {series.upcoming.map((part, i) => (
          <li
            key={t(part.title, "en")}
            className="flex items-center gap-4 rounded-2xl p-3"
          >
            <Number n={published.length + i + 1} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-balance text-muted-foreground">
                <span className="sr-only">
                  {interpolate(dict.blog.series.part, {
                    n: published.length + i + 1,
                  })}
                  :{" "}
                </span>
                {t(part.title, lang)}
              </span>
              <span className="mt-0.5 block text-small text-muted-foreground/80">
                {t(part.summary, lang)}
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[0.75rem] text-muted-foreground">
              {dict.blog.series.soon}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Number({ n, active = false }: { n: number; active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full font-hand text-[1.3rem] leading-none font-semibold",
        active
          ? "bg-(--accent) text-(--on-accent)"
          : "border border-dashed border-border text-muted-foreground",
      )}
    >
      {n}
    </span>
  );
}
