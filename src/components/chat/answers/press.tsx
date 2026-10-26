import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";

import type { PressLink } from "@/content/profile";
import { getDictionary, localeMeta, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";
import { cn } from "@/lib/utils";

/*
 * News coverage of a project, from `project.press` in the profile: the
 * outlet, when, and the headline as it was published (marked with its own
 * language, so a screen reader reads a Portuguese headline in Portuguese).
 * Only links that were opened and checked are listed there.
 */

/** "in Portuguese", when the article's language is not the page's. */
function languageNote(item: PressLink, lang: Locale): string | null {
  if (item.lang.toLowerCase() === localeMeta[lang].htmlLang.toLowerCase()) {
    return null;
  }
  const names: Record<string, string> =
    getDictionary(lang).chat.answers.press.language;
  return names[item.lang] ?? null;
}

/** Month and year only: "Dec 2025". */
function month(item: PressLink, lang: Locale) {
  return formatPartialDate(item.date.slice(0, 7), lang);
}

/** One row per article: the outlet and month, then the headline; the whole row is the link. */
export function PressList({
  items,
  lang,
  className,
}: {
  items: PressLink[];
  lang: Locale;
  className?: string;
}) {
  const dict = getDictionary(lang);
  return (
    <ul className={cn("grid gap-1.5", className)}>
      {items.map((item) => {
        const note = languageNote(item, lang);
        return (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex pressable-panel items-center gap-4 rounded-surface bg-surface px-5 py-4 transition-colors duration-200 ease-out hover:bg-surface-strong sm:px-6 sm:py-5"
            >
              <span className="min-w-0 flex-1">
                <span className="block">
                  <span className="font-medium">{item.outlet}</span>
                  <span className="text-muted-foreground">
                    {", "}
                    <time dateTime={toIsoDate(item.date)}>
                      {month(item, lang)}
                    </time>
                    {note ? `, ${note}` : null}
                  </span>
                </span>
                <span
                  lang={item.lang}
                  className="mt-1 block text-small text-pretty text-muted-foreground"
                >
                  {item.title}
                </span>
              </span>
              <ArrowUpRightIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              />
              <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** The compact version for a card: one pill per outlet; the headline is its accessible name. */
export function PressPills({
  items,
  lang,
  className,
}: {
  items: PressLink[];
  lang: Locale;
  className?: string;
}) {
  const dict = getDictionary(lang);
  return (
    <ul
      aria-label={dict.chat.answers.press.title}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {items.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
            className="inline-flex h-8 pressable items-center gap-1 rounded-full bg-background pr-2.5 pl-3 text-small transition-colors duration-200 ease-out hover:bg-surface-strong"
          >
            {item.outlet}
            <span className="sr-only">
              {": "}
              <span lang={item.lang}>{item.title}</span>, {month(item, lang)} (
              {dict.a11y.opensInNewTab})
            </span>
            <ArrowUpRightIcon
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
