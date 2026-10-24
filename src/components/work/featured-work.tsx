import {
  ArrowRight,
  Lock,
  Monitor,
  Server,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Tag } from "@/components/ui/tag";
import { profile, type Project } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";
import { routes } from "@/lib/routes";

import { CASE_STUDY_ID } from "./hero";
import { WorkSection } from "./work-section";

const AWARD_ID = "conecta-latam-best-ai-project";

function StackList({ stack, label }: { stack: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {stack.map((item) => (
        <li key={item}>
          <Tag>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}

/** The Sales Copilot case study: narrative on the left, ownership stack on the right. */
function CaseStudy({ project, lang }: { project: Project; lang: Locale }) {
  const dict = getDictionary(lang);
  const copy = dict.work.page.featured;
  const award = profile.achievements.find((a) => a.id === AWARD_ID);
  const titleId = `${project.id}-title`;

  const layers: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Monitor, ...copy.layers.frontEnd },
    { icon: Sparkles, ...copy.layers.aiTools },
    { icon: Server, ...copy.layers.backEnd },
  ];

  const facts = [
    project.role
      ? { term: dict.work.labels.role, value: t(project.role, lang) }
      : null,
    project.context ? { term: copy.company, value: project.context } : null,
    project.year
      ? {
          term: copy.year,
          value: (
            <time dateTime={toIsoDate(project.year)}>
              {formatPartialDate(project.year, lang)}
            </time>
          ),
        }
      : null,
  ].filter((fact) => fact !== null);

  return (
    <article
      id={CASE_STUDY_ID}
      aria-labelledby={titleId}
      className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_0_rgb(0_0_0/0.04),0_40px_80px_-56px_color-mix(in_oklch,var(--accent)_45%,transparent)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-50"
      />
      <div className="grid lg:grid-cols-12">
        <div className="flex flex-col p-6 sm:p-10 lg:col-span-7 lg:p-12">
          <p className="font-mono text-eyebrow text-accent uppercase">
            {copy.caseStudy}
          </p>
          <h3
            id={titleId}
            className="mt-4 font-display text-h1 text-foreground"
          >
            {t(project.name, lang)}
          </h3>
          <p className="mt-6 max-w-xl text-lead text-muted-foreground">
            {t(project.description, lang)}
          </p>

          <div aria-hidden="true" className="hidden min-h-10 flex-1 lg:block" />
          {facts.length ? (
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-3 lg:mt-0">
              {facts.map((fact) => (
                <div key={fact.term} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{fact.term}</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-8">
            <StackList stack={project.stack} label={dict.work.labels.stack} />
          </div>
        </div>

        <div className="flex flex-col border-t border-border bg-muted/50 p-6 sm:p-10 lg:col-span-5 lg:border-t-0 lg:border-l lg:p-12">
          <h4 className="text-sm font-medium text-foreground">
            {copy.ownership}
          </h4>

          <div className="mt-6 flex gap-4">
            {/* Bracket: one owner across every layer. */}
            <div aria-hidden="true" className="relative w-5 shrink-0">
              <span className="absolute top-6 bottom-6 left-1/2 w-px -translate-x-1/2 bg-accent/45" />
              <span className="absolute top-6 left-1/2 h-px w-2.5 bg-accent/45" />
              <span className="absolute bottom-6 left-1/2 h-px w-2.5 bg-accent/45" />
              <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-accent ring-4 ring-accent/15" />
            </div>
            <ol className="min-w-0 flex-1 space-y-2.5">
              {layers.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background text-accent">
                    <Icon
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {project.role ? (
            <p className="mt-4 pl-9 font-mono text-xs leading-relaxed text-accent">
              {interpolate(copy.endToEnd, { role: t(project.role, lang) })}
            </p>
          ) : null}
          <div aria-hidden="true" className="hidden min-h-10 flex-1 lg:block" />

          {project.award ? (
            <div className="mt-10 border-t border-border pt-8 lg:mt-0 lg:pt-10">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Trophy
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={1.75}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {dict.work.labels.award}
                  </p>
                  <p className="mt-1 font-display text-[1.75rem] leading-[1.1] text-balance text-foreground">
                    {award ? t(award.title, lang) : t(project.award, lang)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {copy.awardNote}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** A smaller work project card (private work, no links). */
function WorkProjectCard({
  project,
  lang,
}: {
  project: Project;
  lang: Locale;
}) {
  const dict = getDictionary(lang);
  const titleId = `${project.id}-title`;
  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col rounded-2xl border border-border bg-surface/70 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {project.context
            ? interpolate(dict.work.page.featured.alsoAt, {
                company: project.context,
              })
            : null}
          {project.year ? (
            <>
              <span aria-hidden="true" className="mx-2 text-border-strong">
                /
              </span>
              <time dateTime={toIsoDate(project.year)}>
                {formatPartialDate(project.year, lang)}
              </time>
            </>
          ) : null}
        </p>
        {project.isPrivate ? (
          <Tag className="gap-1.5">
            <Lock aria-hidden="true" className="size-3" strokeWidth={2} />
            {dict.work.labels.privateProject}
          </Tag>
        ) : null}
      </div>
      <h3 id={titleId} className="mt-6 font-display text-h3 text-foreground">
        {t(project.name, lang)}
      </h3>
      <p className="mt-3 text-muted-foreground">
        {t(project.description, lang)}
      </p>
      <div className="mt-auto pt-6">
        <StackList stack={project.stack} label={dict.work.labels.stack} />
      </div>
    </article>
  );
}

/** Pointer to the Personal tab, where side projects and open source live. */
function SideProjectsCard({ lang }: { lang: Locale }) {
  const copy = getDictionary(lang).work.page.featured.side;
  const names = profile.projects
    .filter((project) => project.kind === "side" && project.featured)
    .map((project) => t(project.name, lang));

  return (
    <Link
      href={routes.personal(lang)}
      className="group flex h-full flex-col rounded-2xl border border-dashed border-border-strong p-6 transition-colors duration-300 ease-editorial hover:border-accent/50 hover:bg-surface/60 sm:p-8"
    >
      {names.length ? (
        <span className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
          {names.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </span>
      ) : null}
      <span className="mt-6 block font-display text-h3 text-foreground">
        {copy.title}
      </span>
      <span className="mt-3 block text-muted-foreground">
        {copy.description}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-medium text-foreground">
        {copy.cta}
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-300 ease-editorial group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

/** Featured work: the Sales Copilot case study, other work, and a link to side projects. */
export function FeaturedWork({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const copy = dict.work.page.featured;
  const work = profile.projects.filter((project) => project.kind === "work");
  const caseStudy = work.find((project) => project.id === CASE_STUDY_ID);
  const others = work.filter((project) => project.id !== CASE_STUDY_ID);

  return (
    <WorkSection
      id="work"
      layout="stack"
      title={copy.title}
      description={copy.description}
    >
      {caseStudy ? <CaseStudy project={caseStudy} lang={lang} /> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {others.map((project) => (
          <WorkProjectCard key={project.id} project={project} lang={lang} />
        ))}
        <SideProjectsCard lang={lang} />
      </div>
    </WorkSection>
  );
}
