import { ArrowUpRight, Star } from "lucide-react";

import { GitHubIcon } from "@/components/icons";
import { Tag } from "@/components/ui/tag";
import { getSocial, profile, type Project } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

/** Open-source / personal projects from `profile.projects` (kind "side"), featured first. */
export function SideProjects({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const projects = profile.projects.filter(
    (project) => project.kind === "side",
  );
  const featured = projects.filter((project) => project.featured);
  const others = projects.filter((project) => !project.featured);
  const github = getSocial("github");

  return (
    <div className="space-y-4">
      {featured.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {featured.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              lang={lang}
              featured
            />
          ))}
        </ul>
      ) : null}
      {others.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((project) => (
            <ProjectCard key={project.id} project={project} lang={lang} />
          ))}
        </ul>
      ) : null}
      <p className="pt-6">
        <a
          href={github.url}
          target="_blank"
          rel="me noopener noreferrer"
          className="group inline-flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <GitHubIcon size={16} />
          <span className="link-underline">
            {dict.personal.sections.sideProjects.moreOnGitHub}
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
          <span className="sr-only">({dict.a11y.opensInNewTab})</span>
        </a>
      </p>
    </div>
  );
}

function ProjectCard({
  project,
  lang,
  featured = false,
}: {
  project: Project;
  lang: Locale;
  featured?: boolean;
}) {
  const dict = getDictionary(lang);
  const labels = dict.personal.sections.sideProjects;
  const href = project.repoUrl ?? project.liveUrl;
  const name = t(project.name, lang);
  const showLive = Boolean(project.liveUrl && project.liveUrl !== href);

  return (
    <li
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border bg-surface/70 transition-[border-color,background-color,transform,box-shadow] duration-300 ease-editorial hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface hover:shadow-[0_14px_30px_-22px_rgb(0_0_0/0.3)]",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring",
        featured ? "p-6 sm:p-7" : "p-5",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className={cn(
            "min-w-0 font-mono font-medium tracking-tight break-words text-foreground",
            featured ? "text-lg" : "text-[0.95rem]",
          )}
        >
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
            >
              {name}
              <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
            </a>
          ) : (
            name
          )}
        </h3>
        <div className="flex shrink-0 items-center gap-3 pt-0.5 text-muted-foreground">
          {project.stars ? (
            <span
              className="inline-flex items-center gap-1 font-mono text-xs"
              title={interpolate(labels.stars, { count: project.stars })}
            >
              <Star
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={1.75}
              />
              <span aria-hidden="true">{project.stars}</span>
              <span className="sr-only">
                {interpolate(labels.stars, { count: project.stars })}
              </span>
            </span>
          ) : null}
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 transition-[transform,color] duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
          />
        </div>
      </div>

      <p
        className={cn(
          "mt-3 flex-1 text-muted-foreground",
          featured ? "text-base sm:text-[1.0625rem]" : "text-[0.9375rem]",
        )}
      >
        {t(project.description, lang)}
      </p>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <ul className="flex flex-wrap gap-1.5">
          {project.stack.map((item) => (
            <li key={item}>
              <Tag>{item}</Tag>
            </li>
          ))}
        </ul>
        {showLive && project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-subtle px-2.5 py-0.5 font-mono text-[0.72rem] leading-5 text-accent transition-colors hover:border-accent/50"
          >
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            {labels.live}
            <span className="sr-only">
              {" "}
              {name} ({dict.a11y.opensInNewTab})
            </span>
          </a>
        ) : null}
      </div>
    </li>
  );
}
