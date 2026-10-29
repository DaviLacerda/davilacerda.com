import { ChartLineUpIcon } from "@phosphor-icons/react/dist/ssr/ChartLineUp";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";
import type { CSSProperties } from "react";

import { AskLink } from "@/components/chat/assistant";
import { Piece } from "@/components/chat/piece";
import { AsciiBackdrop } from "@/components/ui/ascii-backdrop";
import { LogoTile } from "@/components/ui/logo";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { profile, type Experience, type Project } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import {
  formatDateRange,
  formatPartialDate,
  toIsoDate,
  type PartialDate,
} from "@/i18n/format";
import type { AsciiScene } from "@/lib/ascii/types";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { splitCompanyName } from "@/lib/work/answers";

import {
  BlockTitle,
  Disclosure,
  mutedOn,
  Panel,
  PanelArrow,
  type Tone,
} from "./parts";
import { PressPills } from "./press";

/** Months since year 0 for "YYYY" or "YYYY-MM" (a year alone counts from January). */
function monthIndex(date: PartialDate): number {
  const [year = "0", month = "1"] = date.split("-");
  return Number(year) * 12 + Number(month) - 1;
}

function thisMonth(): PartialDate {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`; // taste-skill-ignore: an ISO month, not a label
}

/**
 * The career as one bar: each job a block as long as it lasted, the current
 * one in ink, from the first start to today (the day the site was built).
 * The blocks draw themselves in from the left (`[data-bar]` in globals.css).
 * The panels below say the same in words, so the bar is one image with a
 * spoken summary.
 */
function Timeline({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const jobs = [...profile.experience]
    .filter((job): job is Experience & { start: PartialDate } =>
      Boolean(job.start),
    )
    .sort((a, b) => monthIndex(a.start) - monthIndex(b.start));
  const first = jobs[0];
  if (!first) return null;
  const today = thisMonth();
  const from = monthIndex(first.start);
  const total = Math.max(1, monthIndex(today) - from);
  const percent = (date: PartialDate) =>
    ((monthIndex(date) - from) / total) * 100;
  const segments = jobs.map((job, index) => {
    const end = job.end ?? today;
    return {
      id: job.id,
      name: splitCompanyName(t(job.company, lang)).short,
      left: percent(job.start),
      width: percent(end) - percent(job.start),
      current: job.end === null,
      start: job.start,
      index,
    };
  });
  const summary = jobs
    .map(
      (job) =>
        `${splitCompanyName(t(job.company, lang)).short}, ${formatDateRange(job.start, job.end, lang)}`,
    )
    .join("; ");
  // 4px between blocks.
  const gap = (index: number) => (index ? 4 : 0);

  return (
    <div role="img" aria-label={summary}>
      <div className="relative h-16 sm:h-20">
        {segments.map((seg) => (
          <div
            key={seg.id}
            data-bar=""
            style={
              {
                left: `calc(${seg.left}% + ${gap(seg.index)}px)`,
                width: `calc(${seg.width}% - ${gap(seg.index)}px)`,
                "--b": seg.index,
              } as CSSProperties
            }
            className={cn(
              "absolute inset-y-0 flex items-center overflow-hidden rounded-2xl px-4 sm:px-5",
              seg.current ? "bg-ink text-on-ink" : "bg-surface-strong",
            )}
          >
            <span className="truncate text-lead font-semibold tracking-tight">
              {seg.name}
            </span>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-6 text-small text-muted-foreground">
        {segments.map((seg) => (
          <span
            key={seg.id}
            className="absolute top-0 whitespace-nowrap"
            style={{ left: `calc(${seg.left}% + ${gap(seg.index)}px)` }}
          >
            {formatPartialDate(seg.start, lang)}
          </span>
        ))}
        <span className="absolute top-0 right-0">{dict.work.labels.today}</span>
      </div>
    </div>
  );
}

/** How many of a job's highlights show before "Show 4 more". */
const SHOWN_HIGHLIGHTS = 3;

/**
 * One job, as a row of the career: who and when (the logo with the dates
 * beside it, the company, the role), then what he did (the first highlights,
 * the rest behind "Show 4 more", then the stack). The current job leads in
 * ink; a past one is lighter, on the surface, a size smaller. Where the panel
 * is wide (42rem and up) the two sit side by side,
 * the dates under the role. Rows are as tall as their own content, so
 * opening one never stretches another.
 */
function JobPanel({ job, lang }: { job: Experience; lang: Locale }) {
  const dict = getDictionary(lang);
  const labels = dict.work.labels;
  const current = job.end === null;
  const tone: Tone = current ? "ink" : "surface";
  const company = splitCompanyName(t(job.company, lang));
  const period = formatDateRange(job.start, job.end, lang);
  const highlights = t(job.highlights, lang);
  const shown = highlights.slice(0, SHOWN_HIGHLIGHTS);
  const more = highlights.slice(SHOWN_HIGHLIGHTS);
  const muted = mutedOn(tone);
  const titleId = `${job.id}-job`;
  const when = job.start ? (
    <time dateTime={toIsoDate(job.start)}>{period}</time>
  ) : (
    period
  );
  const list = cn(
    "list-disc space-y-2.5 pl-5 text-small",
    current ? "marker:text-on-ink-muted" : "marker:text-muted-foreground",
  );

  return (
    <Panel as="article" tone={tone} aria-labelledby={titleId}>
      {/* Stacked; side by side (who and when, then what) where the panel is wide. */}
      <div className="@2xl:grid @2xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] @2xl:gap-x-12">
        <header>
          <div className="flex items-start justify-between gap-4">
            <LogoTile
              logo={job.logo}
              name={company.short}
              size={current ? "xl" : "lg"}
              tone={tone}
            />
            <p className={cn("text-small @2xl:hidden", muted)}>{when}</p>
          </div>
          <h2
            id={titleId}
            className={cn(
              "mt-6 leading-none",
              current
                ? "text-[clamp(2rem,1.7rem+1.4vw,2.75rem)] tracking-[-0.045em]"
                : "text-heading",
            )}
          >
            {job.companyUrl ? (
              <TextLink
                href={job.companyUrl}
                arrow={false}
                newTabLabel={dict.a11y.opensInNewTab}
                className={current ? "text-on-ink" : undefined}
              >
                {company.short}
              </TextLink>
            ) : (
              company.short
            )}
          </h2>
          <p className="mt-3 font-medium">{t(job.role, lang)}</p>
          <p className={cn("mt-1 text-small", muted)}>
            {[company.long, t(job.employmentType, lang), t(job.workModel, lang)]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className={cn("mt-1 hidden text-small @2xl:block", muted)}>
            {when}
          </p>
        </header>

        <div className="mt-8 @2xl:mt-0">
          {shown.length ? (
            <ul aria-label={labels.highlights} className={list}>
              {shown.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {more.length ? (
            <Disclosure
              summary={interpolate(labels.moreHighlights, {
                count: more.length,
              })}
              tone={tone}
              className="mt-4"
            >
              <ul className={cn("mt-4", list)}>
                {more.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
          <TagList
            items={job.stack}
            label={labels.stack}
            logos
            tone={tone}
            className={shown.length ? "mt-8" : undefined}
          />
        </div>
      </div>
    </Panel>
  );
}

/** A project's ASCII scene behind its result panel (Billy's invoices being checked). */
const projectScenes: Partial<Record<string, AsciiScene>> = {
  billy: "invoice",
};

/**
 * A project told by its result: the figure set large ("96%") with what it
 * measures, then the name, one line and, when there is any, the press as
 * small links. The first one (`featured`) spans the row, figure beside text.
 */
function ProjectPanel({
  project,
  metric,
  lang,
  featured,
}: {
  project: Project;
  metric: NonNullable<Project["metric"]>;
  lang: Locale;
  featured: boolean;
}) {
  const titleId = `${project.id}-title`;
  const scene = projectScenes[project.id];
  return (
    <Panel
      as="article"
      aria-labelledby={titleId}
      className={cn(
        "flex h-full flex-col justify-between gap-10",
        scene && "relative isolate overflow-hidden",
        // Side by side, the cards share two rows (the figure, then the name),
        // so their names line up whatever the length of the copy. A subgrid
        // can't be a size container, so the Panel's `@container` is dropped.
        featured
          ? "sm:flex-row sm:items-end sm:gap-12 sm:p-10 sm:*:flex-1"
          : "sm:@container-normal sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:justify-normal",
      )}
    >
      {scene ? <AsciiBackdrop scene={scene} clear /> : null}
      <p className="font-semibold">
        <span
          className={cn(
            "block leading-[0.85] tracking-[-0.06em]",
            featured
              ? "text-figure"
              : "text-[clamp(3.25rem,2.6rem+2.4vw,4.75rem)]",
          )}
        >
          {metric.value}
        </span>
        <span className="mt-3 block font-normal text-muted-foreground">
          {t(metric.label, lang)}
        </span>
      </p>
      <div>
        <h3 id={titleId} className="text-heading">
          {t(project.name, lang)}
        </h3>
        {project.summary ? (
          <p className="mt-1 text-small text-muted-foreground">
            {t(project.summary, lang)}
          </p>
        ) : null}
        {project.press?.length ? (
          <PressPills items={project.press} lang={lang} className="mt-5" />
        ) : null}
      </div>
    </Panel>
  );
}

/**
 * Experience: the career as a bar (the timeline), then one panel per job,
 * the current one in ink, then what else he shipped there: the Sales Copilot
 * as a link to its answer, and the projects told by their results.
 */
export function ExperienceAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const [current] = profile.experience;
  const copilot = profile.projects.find((p) => p.id === "sales-copilot");
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );
  const otherProjects = profile.projects.filter(
    (project) => project.id !== "sales-copilot",
  );
  const results = otherProjects.flatMap((project) =>
    project.metric ? [{ project, metric: project.metric }] : [],
  );
  const otherWork = otherProjects.filter((project) => !project.metric);
  const company = current
    ? splitCompanyName(t(current.company, lang)).short
    : "";

  return (
    <>
      <Piece i={2} className="mt-10">
        <Timeline lang={lang} />
      </Piece>
      <div className="mt-6 grid gap-3 sm:gap-4">
        {profile.experience.map((job, index) => (
          <Piece key={job.id} i={3 + index}>
            <JobPanel job={job} lang={lang} />
          </Piece>
        ))}
      </div>
      {current && (copilot || otherProjects.length) ? (
        <Piece
          i={3 + profile.experience.length}
          as="section"
          className="mt-14"
          aria-labelledby="also-title"
        >
          <BlockTitle id="also-title">
            {interpolate(dict.chat.answers.experience.alsoAt, { company })}
          </BlockTitle>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
            {copilot ? (
              <li className="sm:col-span-2">
                <AskLink
                  href={routes.topic(lang, "sales-copilot")}
                  className="group flex h-full pressable-panel items-center gap-4 rounded-surface bg-surface p-4 hover:bg-surface-strong sm:p-5"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-tile bg-ink text-on-ink">
                    <TrophyIcon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {t(copilot.name, lang)}
                    </span>
                    {award ? (
                      <span className="block text-small text-muted-foreground">
                        {t(award.title, lang)}
                      </span>
                    ) : null}
                  </span>
                  <PanelArrow className="text-muted-foreground group-hover:text-foreground" />
                </AskLink>
              </li>
            ) : null}
            {results.map(({ project, metric }, index) => (
              <li
                key={project.id}
                className={
                  index === 0
                    ? "sm:col-span-2"
                    : "sm:row-span-2 sm:grid sm:grid-rows-subgrid"
                }
              >
                <ProjectPanel
                  project={project}
                  metric={metric}
                  lang={lang}
                  featured={index === 0}
                />
              </li>
            ))}
            {otherWork.map((project) => (
              <li
                key={project.id}
                className="flex h-full items-center gap-4 rounded-surface bg-surface p-4 sm:p-5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-tile bg-background">
                  <ChartLineUpIcon aria-hidden="true" className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {t(project.name, lang)}
                  </span>
                  {project.year ? (
                    <span className="block text-small text-muted-foreground">
                      {formatPartialDate(project.year, lang)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Piece>
      ) : null}
    </>
  );
}
