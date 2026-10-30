import Image from "next/image";
import type { CSSProperties } from "react";

import { watching, type Watching } from "@/content/personal";
import {
  getDictionary,
  interpolate,
  type Dictionary,
  type Locale,
} from "@/i18n";
import { cn } from "@/lib/utils";

import { tileClass, tileLinkClass } from "./parts";

/** "Georgie & Mandy's First Marriage" -> "G&M": the first three words' initials, an "&" kept as is. */
function initials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 3)
    .map((word) =>
      word === "&" ? "&" : (word.match(/\p{L}|\p{N}/u)?.[0] ?? ""),
    )
    .join("")
    .toUpperCase();
}

/**
 * What Davi is watching: a tall tile of the Personal tab's bento grid. The
 * poster stands at the top (2:3, never cropped; without one, the title's
 * initials on a dark card like a title card: ink in light mode, the black
 * page tone in dark), "Watching", the title and where and when it first
 * aired at the bottom. Static: the show is one line in
 * `src/content/personal.ts`; with two shows, the first one is the tile.
 */
export async function WatchingTile({
  lang,
  enter,
  className,
}: {
  lang: Locale;
  /** Place of the tile in the first-paint entrance (`--i`). */
  enter?: number;
  className?: string;
}) {
  const show = watching[0];
  if (!show) return null;
  const dict = getDictionary(lang);
  const poster = show.poster ?? (await fetchPoster(show.title));
  return (
    <WatchingCard
      show={{ ...show, poster }}
      dict={dict}
      enter={enter}
      className={className}
    />
  );
}

/**
 * The show's poster from TVMaze (no key), looked up by title and cached for
 * a day. Any failure leaves the tile on the title's initials.
 */
async function fetchPoster(title: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return undefined;
    const show = (await res.json()) as {
      image?: { medium?: string; original?: string } | null;
    };
    // The original (about 680px wide) stays sharp at the tile's size; the
    // image optimizer serves it resized.
    const src = show.image?.original ?? show.image?.medium;
    return src?.startsWith("https://static.tvmaze.com/") ? src : undefined;
  } catch {
    return undefined;
  }
}

function WatchingCard({
  show,
  dict,
  enter,
  className,
}: {
  show: Watching;
  dict: Dictionary;
  enter?: number;
  className?: string;
}) {
  const details = [show.network, show.year].filter(Boolean).join(", ");
  const label = interpolate(dict.personal.watching.label, {
    title: show.title,
    details,
  });
  const content = (
    <>
      {show.poster ? (
        <Image
          src={show.poster}
          alt=""
          width={680}
          height={1020}
          quality={90}
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 12rem, 66vw"
          className="aspect-[2/3] w-2/3 shrink-0 rounded-[10px] bg-surface-strong object-cover sm:w-48 lg:w-full"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid aspect-[2/3] w-2/3 shrink-0 place-items-center rounded-[10px] bg-ink text-[1.375rem] font-semibold tracking-[-0.02em] text-on-ink sm:w-48 sm:text-[2rem] lg:w-full lg:text-[2.75rem] dark:bg-background dark:text-foreground"
        >
          {initials(show.title)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-small leading-5 text-muted-foreground">
          {dict.personal.watching.status}
        </span>
        <span className="mt-0.5 line-clamp-3 leading-[1.375rem] font-medium">
          {show.title}
        </span>
        {details ? (
          <span className="mt-1 block truncate text-small leading-5 text-muted-foreground">
            {details}
          </span>
        ) : null}
      </span>
    </>
  );

  const tile = cn(
    tileClass,
    "flex h-full flex-col justify-between gap-5 p-4 sm:p-6",
  );
  const entrance =
    enter === undefined
      ? {}
      : { "data-enter": "", style: { "--i": enter } as CSSProperties };

  return (
    <div {...entrance} className={cn("min-w-0", className)}>
      {show.url ? (
        <a
          href={show.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (${dict.a11y.opensInNewTab})`}
          className={cn(tile, tileLinkClass)}
        >
          {content}
        </a>
      ) : (
        <div role="group" aria-label={label} className={tile}>
          {content}
        </div>
      )}
    </div>
  );
}
