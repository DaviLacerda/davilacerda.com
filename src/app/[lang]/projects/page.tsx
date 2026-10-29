import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Reveal } from "@/components/motion/reveal";
import { FeaturedProjectCard, ResultCard } from "@/components/projects/cards";
import { PressStrip } from "@/components/projects/press";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { getPressOutlets, profile } from "@/content/profile";
import { getDictionary, isLocale, t } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  projectJsonLd,
  projectsPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return buildMetadata({
    lang,
    path: "/projects",
    title: dict.meta.projects.title,
    description: dict.meta.projects.description,
    keywords: [
      ...profile.projects.map((project) => t(project.name, lang)),
      ...getPressOutlets().map((entry) => entry.outlet),
      "Conecta Latam",
      "Algar",
    ],
  });
}

/**
 * Projects tab: what Davi built at Algar, told by its results and its press.
 * The title and one line; then the outlets that covered the projects, set
 * as wordmarks that open the articles; then one panel per project. Projects
 * with a page (a `story` in the profile) run across the grid and open it:
 * the award on the ink panel, a figure that counts up on a surface panel.
 * The others sit two across, told by their figure. Everything comes from
 * `profile.projects`: a new project is one entry there.
 */
export default async function ProjectsPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const p = dict.projects;
  const featured = profile.projects.filter((project) => project.story);
  const others = profile.projects.filter((project) => !project.story);
  const enter = (i: number) => ({
    "data-enter": "",
    style: { "--i": i } as CSSProperties,
  });

  return (
    <Container bento className="pt-8 sm:pt-14">
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          projectsPageJsonLd(lang),
          ...profile.projects.map((project) => projectJsonLd(project, lang)),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
            { name: dict.nav.projects, path: routes.projects(lang) },
          ]),
        ]}
      />

      <h1 {...enter(0)} className="text-hero text-display">
        {p.title}
      </h1>
      <p
        {...enter(1)}
        className="mt-4 max-w-[36ch] text-lead text-muted-foreground"
      >
        {p.lead}
      </p>

      <PressStrip lang={lang} enter={2} className="mt-12 sm:mt-16" />

      <ul className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4">
        {featured.map((project, index) => (
          <Reveal
            as="li"
            key={project.id}
            enter={7 + index}
            className="sm:col-span-2"
          >
            <FeaturedProjectCard project={project} lang={lang} />
          </Reveal>
        ))}
        {others.map((project, index) => (
          <Reveal
            as="li"
            key={project.id}
            enter={7 + featured.length + index}
            className={cn(
              "sm:row-span-2 sm:grid sm:grid-rows-subgrid",
              others.length % 2 === 1 &&
                index === others.length - 1 &&
                "sm:col-span-2",
            )}
          >
            <ResultCard project={project} lang={lang} />
          </Reveal>
        ))}
      </ul>
    </Container>
  );
}
