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
export function WatchingCards({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  return watching.map((show) => (
    <WatchingCard key={show.title} show={show} dict={dict} />
  ));
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
