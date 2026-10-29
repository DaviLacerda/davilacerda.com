import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/ssr/ChartLineUp";
import { NewspaperIcon } from "@phosphor-icons/react/dist/ssr/Newspaper";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";
import Link from "next/link";

import { fit } from "@/components/chat/answers/parts";
import { Figure } from "@/components/projects/figure";
import { TagList } from "@/components/ui/tag";
import type { Project } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";
import {
  headlineText,
  projectHeadline,
  projectOutlets,
  type ProjectHeadline,
} from "@/lib/projects";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/*
 * The Projects tab's pictures. A project is told by its result, set as
 * large as its panel allows: the award on the ink panel (the one emphasis
 * on the screen), a figure that counts up on a surface panel. Projects with
 * a page are whole-panel links across the grid; the others sit two across.
 * Monochrome; the only colour is a brand logo in a stack.
 */

const arrow =
  "size-5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5";

/** The outlets that covered a project, as one quiet line. */
function Outlets({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  const outlets = projectOutlets(project);
  if (outlets.length === 0) return null;
  return (
    <span
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-small",
        className,
      )}
    >
      <NewspaperIcon aria-hidden="true" className="size-4 shrink-0" />
      {outlets.map((outlet) => (
        <span key={outlet}>{outlet}</span>
      ))}
    </span>
  );
}

/** The figure with its label, and any other results under it. */
function Results({
  project,
  value,
  label,
  lang,
  size = "figure",
  muted = "text-muted-foreground",
}: {
  project: Project;
  value: string;
  label: string;
  lang: Locale;
  size?: "figure" | "hero" | "compact";
  muted?: string;
}) {
  return (
    <span className="block">
      <Figure
        value={value}
        className={cn(
          "block font-semibold tracking-[-0.06em]",
          size === "hero" && "text-[clamp(5.5rem,3.5rem+8vw,11rem)]",
          size === "figure" && "text-figure",
          size === "compact" && "text-[clamp(3.25rem,2.6rem+2.4vw,4.75rem)]",
          // After the size: tailwind-merge drops a leading set before one.
          "leading-[0.85]",
        )}
      />
      <span
        className={cn(
          "mt-3 block",
          size === "hero" ? "text-heading" : "text-lead",
          size === "hero" ? "" : muted,
        )}
      >
        {label}
      </span>
      {size !== "compact" && project.results?.length ? (
        <span className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          {project.results.map((result) => (
            <span key={t(result.label, "en")} className="block">
              <Figure
                value={t(result.value, lang)}
                className="block text-heading font-semibold tracking-[-0.03em]"
              />
              <span className={cn("block text-small", muted)}>
                {t(result.label, lang)}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------ The tab */

/**
 * A project with a page: a panel across the grid that opens it. With an
 * award, the ink panel: the trophy and the awards' edition, the title set to
 * fill two lines, the category, then the project and its press. With a
 * figure, the surface panel: the number counting up beside the project.
 */
export function FeaturedProjectCard({
  project,
  lang,
}: {
  project: Project;
  lang: Locale;
}) {
  const headline = projectHeadline(project, lang);
  const name = t(project.name, lang);
  const summary = project.summary ? t(project.summary, lang) : null;
  const href = routes.project(lang, project.id);

  if (headline?.kind === "award") {
    return (
      <Link
        href={href}
        className="group flex min-h-[24rem] pressable-panel flex-col justify-between gap-14 rounded-panel bg-ink p-6 text-on-ink transition-colors duration-200 ease-out hover:bg-ink/90 sm:min-h-[28rem] sm:p-10"
      >
        <span className="flex items-center justify-between gap-4 text-small text-on-ink-muted">
          <span className="inline-flex items-center gap-2.5">
            <TrophyIcon aria-hidden="true" className="size-6 text-on-ink" />
            {headline.event ?? headline.issuer}
          </span>
          <ArrowRightIcon
            aria-hidden="true"
            className={cn(arrow, "text-on-ink")}
          />
        </span>
        <span className="@container block">
          <span
            className="block leading-[0.95] font-semibold tracking-[-0.05em] text-balance"
            style={fit(headline.title, { max: 6.25, min: 2.25 })}
          >
            {headline.title}
          </span>
          {headline.category ? (
            <span className="mt-4 block max-w-[46ch] text-on-ink-muted">
              {headline.category}
            </span>
          ) : null}
        </span>
        <span className="grid gap-x-10 gap-y-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <span className="block">
            <h2 className="text-heading">{name}</h2>
            {summary ? (
              <span className="mt-1 block text-on-ink-muted">{summary}</span>
            ) : null}
          </span>
          <Outlets project={project} className="text-on-ink-muted" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group grid min-h-[20rem] pressable-panel gap-12 rounded-panel bg-surface p-6 transition-colors duration-200 ease-out hover:bg-surface-strong sm:grid-cols-2 sm:gap-12 sm:p-10"
    >
      {headline ? (
        <Results
          project={project}
          value={headline.kind === "metric" ? headline.value : ""}
          label={headline.kind === "metric" ? headline.label : ""}
          lang={lang}
        />
      ) : (
        <span />
      )}
      <span className="flex flex-col justify-between gap-8">
        <ArrowRightIcon
          aria-hidden="true"
          className={cn(
            arrow,
            "hidden self-end text-muted-foreground group-hover:text-foreground sm:block",
          )}
        />
        <span className="block">
          <h2 className="text-heading">{name}</h2>
          {summary ? (
            <span className="mt-1 block text-muted-foreground">{summary}</span>
          ) : null}
          <Outlets project={project} className="mt-5 text-muted-foreground" />
        </span>
      </span>
    </Link>
  );
}

/**
 * A project without a page, told by its figure: the number counting up,
 * what it measures, then the name, one line and the stack. Two sit side by
 * side on a shared subgrid, so their names line up.
 */
export function ResultCard({
  project,
  lang,
}: {
  project: Project;
  lang: Locale;
}) {
  const titleId = `${project.id}-title`;
  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col justify-between gap-10 rounded-panel bg-surface p-6 sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:gap-10 sm:p-8"
    >
      {project.metric ? (
        <Results
          project={project}
          value={project.metric.value}
          label={t(project.metric.label, lang)}
          lang={lang}
          size="compact"
        />
      ) : (
        <span />
      )}
      <div>
        <h2 id={titleId} className="text-heading">
          {t(project.name, lang)}
        </h2>
        {project.summary ? (
          <p className="mt-1 text-small text-muted-foreground">
            {t(project.summary, lang)}
          </p>
        ) : null}
        <TagList
          items={project.stack}
          label={getDictionary(lang).work.labels.stack}
          logos
          tone="surface"
          className="mt-5"
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------ A project's page */

/**
 * The top of a project's page: its result on the ink panel. An award: the
 * trophy, the awards' edition and month, the title as large as the panel
 * allows, the category. A figure: the same frame, the number counting up
 * at its foot, what it measures, and the other results under it.
 */
export function ProjectHero({
  project,
  headline,
  lang,
  className,
}: {
  project: Project;
  headline: ProjectHeadline;
  lang: Locale;
  className?: string;
}) {
  const p = getDictionary(lang).projects;
  if (headline.kind === "award") {
    return (
      <div
        className={cn(
          "flex min-h-[20rem] flex-col justify-between gap-16 rounded-panel bg-ink p-6 text-on-ink sm:min-h-[27rem] sm:p-10",
          className,
        )}
      >
        <p className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-small text-on-ink-muted">
          <span className="inline-flex items-center gap-2.5">
            <TrophyIcon aria-hidden="true" className="size-6 text-on-ink" />
            {p.award}
          </span>
          {headline.event || headline.issuer ? (
            <span>
              {headline.event ?? headline.issuer}
              {headline.date ? (
                <>
                  {", "}
                  <time dateTime={toIsoDate(headline.date)}>
                    {formatPartialDate(headline.date, lang)}
                  </time>
                </>
              ) : null}
            </span>
          ) : null}
        </p>
        <div className="@container">
          <p
            className="leading-[0.95] font-semibold tracking-[-0.05em] text-balance"
            style={fit(headline.title, { max: 7, min: 2.25 })}
          >
            {headline.title}
          </p>
          {headline.category ? (
            <p className="mt-5 max-w-[46ch] text-lead text-on-ink-muted">
              {headline.category}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[20rem] flex-col justify-between gap-12 rounded-panel bg-ink p-6 text-on-ink sm:min-h-[27rem] sm:p-10",
        className,
      )}
    >
      <p className="inline-flex items-center gap-2.5 text-small text-on-ink-muted">
        <ChartLineUpIcon aria-hidden="true" className="size-6 text-on-ink" />
        {p.result}
      </p>
      <Results
        project={project}
        value={headline.value}
        label={headline.label}
        lang={lang}
        size="hero"
        muted="text-on-ink-muted"
      />
    </div>
  );
}

/** The way on at the foot of a project's page: the next project and its result. */
export function NextProjectLink({
  project,
  lang,
}: {
  project: Project;
  lang: Locale;
}) {
  const p = getDictionary(lang).projects;
  return (
    <Link
      href={routes.project(lang, project.id)}
      className="group flex pressable-panel items-center justify-between gap-6 rounded-panel bg-surface p-6 transition-colors duration-200 ease-out hover:bg-surface-strong sm:p-8"
    >
      <span className="min-w-0">
        <span className="block text-small text-muted-foreground">{p.next}</span>
        <span className="mt-1 block text-[clamp(1.75rem,1.4rem+1.6vw,2.75rem)] leading-none font-semibold tracking-[-0.045em]">
          {t(project.name, lang)}
        </span>
        <span className="mt-3 block text-muted-foreground">
          {headlineText(projectHeadline(project, lang))}
        </span>
      </span>
      <ArrowRightIcon
        aria-hidden="true"
        className={cn(
          arrow,
          "size-6 text-muted-foreground group-hover:text-foreground",
        )}
      />
    </Link>
  );
}
