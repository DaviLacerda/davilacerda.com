import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";

import { Reveal } from "@/components/motion/reveal";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { getSocial, profile, type Project } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";

/**
 * Open-source and personal projects (`kind: "side"`), featured first, two
 * columns from 640px: the name (a link) with its stars, one line on what it
 * is, and the stack as tags with the technologies' logos.
 */
export function SideProjects({
  lang,
  enter,
}: {
  lang: Locale;
  /** Place in the entrance (see `Reveal`). */
  enter?: number;
}) {
  const dict = getDictionary(lang);
  const projects = [...profile.projects]
    .filter((project) => project.kind === "side")
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  const github = getSocial("github");

  return (
    <>
      <Reveal
        as="ul"
        stagger
        enter={enter}
        className="mt-6 grid gap-x-10 gap-y-9 sm:grid-cols-2"
      >
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project} lang={lang} />
        ))}
      </Reveal>
      <p className="mt-9">
        <TextLink
          href={github.url}
          newTabLabel={dict.a11y.opensInNewTab}
          className="font-medium"
        >
          {dict.personal.sections.sideProjects.moreOnGitHub}
        </TextLink>
      </p>
    </>
  );
}

function ProjectItem({ project, lang }: { project: Project; lang: Locale }) {
  const dict = getDictionary(lang);
  const labels = dict.personal.sections.sideProjects;
  const href = project.repoUrl ?? project.liveUrl;
  const name = t(project.name, lang);
  const showLive = Boolean(project.liveUrl && project.liveUrl !== href);

  return (
    <li>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-semibold">
          {href ? (
            <TextLink href={href} newTabLabel={dict.a11y.opensInNewTab}>
              {name}
            </TextLink>
          ) : (
            name
          )}
        </h3>
        {project.stars !== undefined ? (
          <p className="inline-flex items-center gap-1 text-small text-muted-foreground">
            <StarIcon aria-hidden="true" className="size-3.5 self-center" />
            <span className="sr-only">
              {interpolate(labels.stars, { count: project.stars })}
            </span>
            <span aria-hidden="true">{project.stars}</span>
          </p>
        ) : null}
        {showLive && project.liveUrl ? (
          <TextLink
            href={project.liveUrl}
            newTabLabel={dict.a11y.opensInNewTab}
            className="text-small text-muted-foreground"
          >
            {labels.live}
          </TextLink>
        ) : null}
      </div>
      <p className="mt-1 text-muted-foreground">
        {t(project.description, lang)}
      </p>
      <TagList
        items={project.stack}
        label={labels.stack}
        logos
        className="mt-3"
      />
    </li>
  );
}
