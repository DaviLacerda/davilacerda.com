import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Reveal } from "@/components/motion/reveal";
import { NextProjectLink, ProjectHero } from "@/components/projects/cards";
import { DemoVideo } from "@/components/projects/demo-video";
import { PressCards } from "@/components/projects/press";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { BrandLogo, LogoTile } from "@/components/ui/logo";
import { TagList } from "@/components/ui/tag";
import { getProjectPage, getProjectPages, profile } from "@/content/profile";
import { getDictionary, interpolate, isLocale, t } from "@/i18n";
import { formatPartialDate } from "@/i18n/format";
import { techLogo } from "@/lib/logos";
import {
  nextProject,
  projectDemo,
  projectHeadline,
  projectMeta,
} from "@/lib/projects";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  projectJsonLd,
  projectPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { splitCompanyName } from "@/lib/work/answers";

type PageProps = { params: Promise<{ lang: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjectPages().map((project) => ({ slug: project.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const project = getProjectPage(slug);
  if (!isLocale(lang) || !project) return {};
  const meta = projectMeta(project, lang);
  return buildMetadata({
    lang,
    path: `/projects/${project.id}`,
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
  });
}

/**
 * One project's page, e.g. `/en/projects/sales-copilot`: the result first,
 * then the story. The name and one line; the demo, playing, when its files
 * exist; the facts (company, year, role, access); the result on the ink
 * panel (the award, or the figure counting up); every article that covered it, as
 * cards, right under the result; the problem beside what it does; how it is
 * built, part by part with the stack's logos (or the stack alone); and the
 * next project. All from the project's entry in `profile.projects`.
 */
export default async function ProjectPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const project = getProjectPage(slug);
  if (!isLocale(lang) || !project?.story) notFound();
  const dict = getDictionary(lang);
  const p = dict.projects;
  const { story } = project;
  const name = t(project.name, lang);
  const headline = projectHeadline(project, lang);
  const demo = projectDemo(project.id);
  const next = nextProject(project);
  const employer = profile.experience.find(
    (job) => splitCompanyName(t(job.company, lang)).short === project.context,
  );
  const enter = (i: number) => ({
    "data-enter": "",
    style: { "--i": i } as CSSProperties,
  });

  const facts = [
    project.context
      ? {
          label: p.facts.company,
          value: (
            <span className="inline-flex items-center gap-3">
              <LogoTile
                logo={employer?.logo}
                name={project.context}
                size="md"
              />
              {project.context}
            </span>
          ),
        }
      : null,
    project.year
      ? { label: p.facts.year, value: formatPartialDate(project.year, lang) }
      : null,
    project.role ? { label: p.facts.role, value: t(project.role, lang) } : null,
    project.isPrivate
      ? { label: p.facts.access, value: dict.work.labels.privateProject }
      : null,
  ].filter((fact) => fact !== null);

  return (
    <Container bento className="pt-8 sm:pt-14">
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          projectPageJsonLd(project, lang),
          projectJsonLd(project, lang),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
            { name: dict.nav.projects, path: routes.projects(lang) },
            { name, path: routes.project(lang, project.id) },
          ]),
        ]}
      />

      <div {...enter(0)}>
        <Link
          href={routes.projects(lang)}
          className="-ml-1 inline-flex h-9 pressable items-center gap-1.5 rounded-full bg-surface pr-4 pl-3 text-small font-medium text-muted-foreground hover:bg-surface-strong hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {p.all}
        </Link>
      </div>

      <h1 {...enter(1)} className="mt-8 text-hero text-display sm:mt-10">
        {name}
      </h1>
      {project.summary ? (
        <p
          {...enter(2)}
          className="mt-4 max-w-[40ch] text-lead text-muted-foreground"
        >
          {t(project.summary, lang)}
        </p>
      ) : null}

      {/* The demo first: seeing it work says more than any fact below. */}
      {demo ? (
        <div {...enter(3)} className="mt-10">
          <DemoVideo
            demo={demo}
            label={interpolate(p.demo, { name })}
            note={p.demoNote}
          />
        </div>
      ) : null}

      {facts.length ? (
        <dl
          {...enter(3)}
          className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4"
        >
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-small text-muted-foreground">{fact.label}</dt>
              <dd className="mt-2 text-lead font-semibold tracking-tight">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {headline ? (
        <div {...enter(4)} className="mt-10">
          <ProjectHero project={project} headline={headline} lang={lang} />
        </div>
      ) : null}

      {/* The press right under the result: what others wrote comes first. */}
      {project.press?.length ? (
        <section aria-labelledby="press-title" className="mt-20 sm:mt-24">
          <Reveal>
            <h2 id="press-title" className="text-heading">
              {p.press}
            </h2>
            <p className="mt-2 text-small text-muted-foreground">
              {p.pressNote}
            </p>
          </Reveal>
          <PressCards items={project.press} lang={lang} className="mt-6" />
        </section>
      ) : null}

      <Reveal
        stagger
        className="mt-20 grid gap-x-12 gap-y-12 sm:mt-24 sm:grid-cols-2"
      >
        <section aria-labelledby="problem-title">
          <h2 id="problem-title" className="text-heading">
            {p.problem}
          </h2>
          <p className="mt-4 text-lead text-pretty">{t(story.problem, lang)}</p>
        </section>
        <section aria-labelledby="solution-title">
          <h2 id="solution-title" className="text-heading">
            {p.solution}
          </h2>
          <ul className="mt-4 list-disc space-y-2.5 pl-5 marker:text-muted-foreground">
            {t(story.solution, lang).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal
        as="section"
        aria-labelledby="build-title"
        className="mt-20 sm:mt-24"
      >
        <h2 id="build-title" className="text-heading">
          {p.build}
        </h2>
        {story.build?.length ? (
          <ul className="mt-5 grid gap-1.5">
            {story.build.map((layer) => (
              <li
                key={t(layer.part, "en")}
                className="flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-surface px-5 py-3 sm:min-h-[4.5rem] sm:px-6"
              >
                <span className="text-lead font-medium">
                  {t(layer.part, lang)}
                </span>
                <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-muted-foreground">
                  {layer.stack.map((tech) => {
                    const logo = techLogo(tech);
                    return (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-2.5"
                      >
                        {logo ? (
                          <BrandLogo id={logo} className="size-6" />
                        ) : null}
                        {tech}
                      </span>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          // Without the split by part, the stack on its own.
          <TagList
            items={project.stack}
            label={dict.work.labels.stack}
            logos
            className="mt-5"
          />
        )}
      </Reveal>

      {next ? (
        <Reveal className="mt-20 sm:mt-24">
          <NextProjectLink project={next} lang={lang} />
        </Reveal>
      ) : null}
    </Container>
  );
}
