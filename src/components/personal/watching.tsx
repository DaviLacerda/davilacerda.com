import Image from "next/image";

import { watching, type Watching } from "@/content/personal";
import {
  getDictionary,
  interpolate,
  type Dictionary,
  type Locale,
} from "@/i18n";

import { CardLink, CardText, cardClass, Tile } from "./parts";

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
 * What Davi is watching, beside the Spotify card and in its shape: the
 * poster (or, without one, the title's initials on a dark tile like a
 * title card: ink in light mode, the black page tone in dark), "Watching" and the title on up to two lines. Where and when
 * it first aired go into its accessible name. Static: the show is one line
 * in `src/content/personal.ts`.
 */
export async function WatchingCards({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const posters = await Promise.all(
    watching.map((show) => show.poster ?? fetchPoster(show.title)),
  );
  return watching.map((show, i) => (
    <WatchingCard
      key={show.title}
      show={{ ...show, poster: posters[i] }}
      dict={dict}
    />
  ));
}

/**
 * The show's poster from TVMaze (no key), looked up by title and cached for
 * a day. Any failure leaves the card on the title's initials.
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
    const src = show.image?.medium ?? show.image?.original;
    return src?.startsWith("https://static.tvmaze.com/") ? src : undefined;
  } catch {
    return undefined;
  }
}

function WatchingCard({ show, dict }: { show: Watching; dict: Dictionary }) {
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
          width={44}
          height={64}
          sizes="2.75rem"
          className="h-16 w-11 shrink-0 rounded-[6px] bg-surface-strong object-cover"
        />
      ) : (
        <Tile className="bg-ink text-[1.0625rem] font-semibold tracking-[-0.02em] text-on-ink dark:bg-background dark:text-foreground">
          {initials(show.title)}
        </Tile>
      )}
      <CardText status={dict.personal.watching.status} title={show.title} />
    </>
  );

  return show.url ? (
    <CardLink href={show.url} label={`${label} (${dict.a11y.opensInNewTab})`}>
      {content}
    </CardLink>
  ) : (
    <div role="group" aria-label={label} className={cardClass}>
      {content}
    </div>
  );
}
