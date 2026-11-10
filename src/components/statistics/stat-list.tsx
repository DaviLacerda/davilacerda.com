import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";

import { TextLink } from "@/components/ui/text-link";
import {
  getStatSource,
  type Statistic,
  type StatSection,
} from "@/content/statistics";
import { getDictionary, t, type Locale } from "@/i18n";
import { sourceLine, statisticProjectPath } from "@/lib/statistics";
import { cn } from "@/lib/utils";

/*
 * The Statistics page's lines. One statistic per row: the figure set large
 * on the left, then one sentence that stands on its own and names the
 * research, then the source with its date, linked to the original. No
 * fills or rules between rows; the figure column and the space do the work.
 * Davi's own numbers sit on the page's one ink panel.
 */

type Tone = "page" | "ink";

/**
 * The source's line with the external-link arrow tied to its last word, so
 * the arrow never wraps onto a line of its own.
 */
function SourceLabel({ text }: { text: string }) {
  const cut = text.lastIndexOf(" ") + 1;
  return (
    <>
      {text.slice(0, cut)}
      <span className="whitespace-nowrap">
        {text.slice(cut)}
        <ArrowUpRightIcon
          aria-hidden="true"
          className="ml-0.5 inline size-[0.85em]"
        />
      </span>
    </>
  );
}

/**
 * One statistic. The figure repeats what the sentence states, so it is
 * hidden from assistive technology; the row's `id` makes it linkable
 * (`/en/statistics#langchain-agents-in-production`).
 */
function StatRow({
  stat,
  lang,
  tone,
}: {
  stat: Statistic;
  lang: Locale;
  tone: Tone;
}) {
  const dict = getDictionary(lang);
  const s = dict.statistics;
  const source = getStatSource(stat);
  const project = statisticProjectPath(stat, lang);
  const muted = tone === "ink" ? "text-on-ink-muted" : "text-muted-foreground";
  // Source lines wrap, so the link runs inline with the text.
  const link = cn(
    "inline",
    tone === "ink" ? "text-on-ink [&_svg]:text-on-ink-muted" : muted,
  );

  return (
    <li
      id={stat.id}
      className="grid scroll-mt-8 gap-x-10 gap-y-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-baseline"
    >
      <p
        aria-hidden="true"
        className="text-answer font-semibold whitespace-nowrap tabular-nums"
      >
        {t(stat.value, lang)}
      </p>
      <div>
        <p className="max-w-[58ch] text-lead text-pretty">
          {t(stat.text, lang)}
        </p>
        <p className={cn("mt-3 max-w-[70ch] text-small text-pretty", muted)}>
          {s.source}:{" "}
          {source ? (
            <>
              <cite className="not-italic">
                <TextLink
                  href={t(source.url, lang)}
                  arrow={false}
                  newTabLabel={dict.a11y.opensInNewTab}
                  className={link}
                >
                  <SourceLabel text={sourceLine(source, lang)} />
                </TextLink>
              </cite>
              .{source.method ? <> {t(source.method, lang)}</> : null}
            </>
          ) : (
            <>{s.ownSource}.</>
          )}
          {project ? (
            <>
              {" "}
              <TextLink href={project} className={link}>
                {s.project}
              </TextLink>
            </>
          ) : null}
        </p>
      </div>
    </li>
  );
}

/**
 * A section: its `h2` (written as the search it answers), one or two
 * sentences on what the numbers measure, then the rows. With `own`, the
 * whole section is the ink panel.
 */
export function StatSectionBlock({
  section,
  lang,
}: {
  section: StatSection;
  lang: Locale;
}) {
  const tone: Tone = section.own ? "ink" : "page";
  const titleId = `${section.id}-title`;
  return (
    <section
      id={section.id}
      aria-labelledby={titleId}
      className={cn(
        "scroll-mt-8",
        section.own && "rounded-panel bg-ink px-6 py-10 text-on-ink sm:p-12",
      )}
    >
      <h2 id={titleId} className="max-w-[28ch] text-heading text-balance">
        {t(section.title, lang)}
      </h2>
      {section.intro ? (
        <p
          className={cn(
            "mt-3 max-w-[62ch] text-pretty",
            tone === "ink" ? "text-on-ink-muted" : "text-muted-foreground",
          )}
        >
          {t(section.intro, lang)}
        </p>
      ) : null}
      <ul className="mt-10 grid gap-y-10 sm:gap-y-12">
        {section.stats.map((stat) => (
          <StatRow key={stat.id} stat={stat} lang={lang} tone={tone} />
        ))}
      </ul>
    </section>
  );
}
