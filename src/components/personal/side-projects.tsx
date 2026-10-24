import { Reveal } from "@/components/motion/reveal";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { getSocial, profile, type Project } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";

/**
 * Open-source and personal projects (`kind: "side"`), featured first: name
 * and stars on one line, what it is, then the stack as tags.
 */
export function SideProjects({ lang }: { lang: Locale }) {
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
        className="mt-8 grid gap-x-10 gap-y-12 sm:grid-cols-2"
      >
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} lang={lang} />
        ))}
      </Reveal>
      <p className="mt-10">
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

function ProjectRow({ project, lang }: { project: Project; lang: Locale }) {
  const dict = getDictionary(lang);
  const labels = dict.personal.sections.sideProjects;
  const href = project.repoUrl ?? project.liveUrl;
  const name = t(project.name, lang);
  const showLive = Boolean(project.liveUrl && project.liveUrl !== href);

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-lead font-medium">
          {href ? (
            <TextLink href={href} newTabLabel={dict.a11y.opensInNewTab}>
              {name}
            </TextLink>
          ) : (
            name
          )}
        </h3>
        {project.stars !== undefined ? (
          <p className="text-small text-muted-foreground">
            {interpolate(labels.stars, { count: project.stars })}
          </p>
        ) : null}
      </div>
      <p className="mt-1">{t(project.description, lang)}</p>
      {project.stack.length || showLive ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <TagList items={project.stack} label={labels.stack} />
          {showLive && project.liveUrl ? (
            <TextLink
              href={project.liveUrl}
              newTabLabel={dict.a11y.opensInNewTab}
              className="text-small"
            >
              {labels.live}
            </TextLink>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
