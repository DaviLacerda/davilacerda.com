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
  // The part after the one being read: an empty piece Piet fits into.
  const at = published.findIndex((post) => post.translationKey === current);
  const next = at >= 0 ? at + 1 : -1;
  const fits = (
    <span className="series-fits font-hand text-[1.2rem] leading-none font-semibold text-(--accent)">
      {dict.blog.series.fits}
    </span>
  );

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
              {i === next ? (
                <Slot n={i + 1} />
              ) : (
                <Number n={i + 1} active={here} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-balance">
                  {post.title}
                </span>
                <span className="mt-0.5 block text-small text-muted-foreground">
                  {here ? dict.blog.series.youAreHere : post.description}
                </span>
                {i === next ? fits : null}
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
            {published.length + i === next ? (
              <Slot n={published.length + i + 1} />
            ) : (
              <Number n={published.length + i + 1} />
            )}
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
              {published.length + i === next ? fits : null}
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

/**
 * The next part's number as an empty, dashed puzzle piece: at the end of a
 * post, Piet (`PietGuide`) flies down and fits into it (`data-piet-slot`).
 */
function Slot({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="series-slot" data-piet-slot="">
      <svg viewBox="-20 -20 863 635" className="series-slot-piece">
        <path d="M 259 0 L 324 0 C 336.15 0 346 9.85 346 22 L 346 47.25 C 322.69 73.85 327.98 110.2 358.3 131.8 C 388.63 153.4 434.37 153.4 464.7 131.8 C 495.02 110.2 500.31 73.85 477 47.25 L 477 22 C 477 9.85 486.85 0 499 0 L 564 0 C 633.04 0 689 55.96 689 125 L 689 470 C 689 539.04 633.04 595 564 595 L 499 595 C 486.85 595 477 585.15 477 573 L 477 547.75 C 500.31 521.15 495.02 484.8 464.7 463.2 C 434.37 441.6 388.63 441.6 358.3 463.2 C 327.98 484.8 322.69 521.15 346 547.75 L 346 573 C 346 585.15 336.15 595 324 595 L 259 595 C 189.96 595 134 539.04 134 470 L 134 125 C 134 55.96 189.96 0 259 0 Z" />
      </svg>
      <span className="series-slot-n">{n}</span>
    </span>
  );
}
