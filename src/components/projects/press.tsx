import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import type { CSSProperties } from "react";

import { Reveal } from "@/components/motion/reveal";
import { getPressOutlets, type PressLink } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import { formatDate, formatPartialDate, toIsoDate } from "@/i18n/format";
import { cn } from "@/lib/utils";

/*
 * The press on the Projects tab: the outlets as a row of wordmarks (each
 * one links to its newest article) and, on a project's page, every article
 * as a card. The articles cover the projects, not Davi by name, so the copy
 * around them always speaks of the project. Headlines stay as published and
 * carry their own language (`lang`), so a screen reader reads a Portuguese
 * headline in Portuguese. Outlets have no logo in the registry: their names
 * are set as wordmarks in the site's face.
 */

/** "Portuguese" / "Português", for the tag beside an article. */
function languageName(item: PressLink, lang: Locale): string {
  const names: Record<string, string> = getDictionary(lang).projects.language;
  return names[item.lang] ?? item.lang;
}

/**
 * The outlets that covered the projects, newest first, set large and grey;
 * each turns ink on hover and opens its newest article.
 */
export function PressStrip({
  lang,
  enter,
  className,
}: {
  lang: Locale;
  /** Place in the first-paint entrance. */
  enter?: number;
  className?: string;
}) {
  const dict = getDictionary(lang);
  const outlets = getPressOutlets();
  if (outlets.length === 0) return null;
  const entering = (i: number) =>
    enter === undefined
      ? {}
      : { "data-enter": "", style: { "--i": enter + i } as CSSProperties };

  return (
    <section aria-labelledby="press-strip-title" className={className}>
      <h2
        id="press-strip-title"
        {...entering(0)}
        className="text-small font-medium text-muted-foreground"
      >
        {dict.projects.press}
      </h2>
      <ul className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2 sm:mt-4 sm:gap-x-12">
        {outlets.map(({ outlet, articles }, index) => {
          const [latest] = articles;
          if (!latest) return null;
          return (
            <li key={outlet} {...entering(1 + index)}>
              <a
                href={latest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-block rounded-lg text-[clamp(1.5rem,1.2rem+1.3vw,2.25rem)] leading-[1.15] font-semibold tracking-[-0.045em] text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground"
              >
                {outlet}
                {/* Out of the flow, so the hidden arrow takes no room in the row. */}
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="absolute top-[0.18em] -right-[0.55em] size-[0.45em] opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                <span className="sr-only">
                  {": "}
                  <span lang={latest.lang}>{latest.title}</span>,{" "}
                  {formatPartialDate(latest.date.slice(0, 7), lang)} (
                  {dict.a11y.opensInNewTab})
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * A project's articles as cards: the outlet set as a wordmark, the headline
 * as published, the date and the article's language; the whole card is the
 * link. Two across from 640px; with an odd count the newest spans the row,
 * so no cell is left empty. They rise in one after another as they scroll
 * into view.
 */
export function PressCards({
  items,
  lang,
  className,
}: {
  items: PressLink[];
  lang: Locale;
  className?: string;
}) {
  const dict = getDictionary(lang);
  const odd = items.length % 2 === 1;
  return (
    <Reveal
      as="ul"
      stagger
      className={cn("grid gap-3 sm:grid-cols-2 sm:gap-4", className)}
    >
      {items.map((item, index) => (
        <li
          key={item.url}
          className={cn(odd && index === 0 && "sm:col-span-2")}
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-full min-h-[13rem] pressable-panel flex-col justify-between gap-10 rounded-panel bg-surface p-6 transition-colors duration-200 ease-out hover:bg-surface-strong sm:p-8"
          >
            <span className="flex items-start justify-between gap-4">
              <span className="text-heading font-semibold tracking-[-0.04em]">
                {item.outlet}
              </span>
              <ArrowUpRightIcon
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-muted-foreground transition-[color,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              />
            </span>
            <span className="block">
              <span
                lang={item.lang}
                className={cn(
                  "block font-medium text-pretty",
                  odd && index === 0
                    ? "text-lead sm:max-w-[40ch]"
                    : "text-lead",
                )}
              >
                {item.title}
              </span>
              <span className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-muted-foreground">
                <time dateTime={toIsoDate(item.date)}>
                  {item.date.length === 10
                    ? formatDate(item.date, lang)
                    : formatPartialDate(item.date, lang)}
                </time>
                <span className="rounded-full bg-background px-2.5 leading-6 text-foreground">
                  {languageName(item, lang)}
                </span>
              </span>
              <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
            </span>
          </a>
        </li>
      ))}
    </Reveal>
  );
}
