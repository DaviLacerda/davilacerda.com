import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import type { ReactNode } from "react";

import { AskLink } from "@/components/chat/ask-link";
import { CopyEmailButton } from "@/components/chat/copy-email-button";
import { Facts, Widget } from "@/components/chat/widget";
import { ButtonLink } from "@/components/ui/button";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import {
  getCertifications,
  getSocial,
  profile,
  type Experience,
} from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatDateRange, formatPartialDate, toIsoDate } from "@/i18n/format";
import { routes } from "@/lib/routes";
import { timezoneOffset, topicCopy } from "@/lib/work/answers";
import type { TopicId } from "@/lib/work/topics";

/*
 * The predefined "generative UI" of each Work topic: the blocks rendered
 * under the answer's lead paragraph. Every block is server-rendered HTML
 * built from `src/content/profile.ts`; the topic page reveals them as one
 * chat turn. Third person throughout: the assistant speaks about Davi.
 */

type Blocks = ReactNode[];

/** Small link to another topic, at the foot of an answer block. */
function TopicLink({ lang, topic }: { lang: Locale; topic: TopicId }) {
  return (
    <AskLink
      href={routes.topic(lang, topic)}
      className="group mt-6 inline-flex items-center gap-2 font-medium link-underline"
    >
      {topicCopy(topic, lang).question}
      <ArrowRightIcon
        aria-hidden="true"
        className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
      />
    </AskLink>
  );
}

/* ------------------------------------------------------------- Experience */

function JobWidget({
  job,
  lang,
  extra,
}: {
  job: Experience;
  lang: Locale;
  extra?: ReactNode;
}) {
  const labels = getDictionary(lang).work.labels;
  const period = formatDateRange(job.start, job.end, lang);
  // "Brain (Centro de Inovação em Negócios Digitais)": the short name is the
  // heading, the long form stays in it as a quieter second line.
  const [, shortName = t(job.company, lang), longName] =
    /^(.+?) \((.+)\)$/.exec(t(job.company, lang)) ?? [];
  return (
    <Widget>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-heading">
          {job.companyUrl ? (
            <TextLink href={job.companyUrl} arrow={false}>
              {shortName}
            </TextLink>
          ) : (
            shortName
          )}
          {longName ? (
            <span className="mt-1 block text-small font-normal tracking-normal text-muted-foreground">
              {longName}
            </span>
          ) : null}
        </h2>
        <p className="text-muted-foreground">
          {job.start ? (
            <time dateTime={toIsoDate(job.start)}>{period}</time>
          ) : (
            period
          )}
        </p>
      </div>
      <p className="mt-1 text-lead">{t(job.role, lang)}</p>
      <p className="mt-1 text-small text-muted-foreground">
        {[
          t(job.employmentType, lang),
          t(job.workModel, lang),
          t(job.location, lang),
        ].join(", ")}
      </p>
      <ul className="mt-6 list-disc space-y-3 pl-5 marker:text-muted-foreground">
        {t(job.highlights, lang).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <TagList
        items={job.stack}
        label={labels.stack}
        tone="surface"
        className="mt-6"
      />
      {extra}
    </Widget>
  );
}

function experienceBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const otherWork = profile.projects.filter(
    (project) => project.kind === "work" && project.id !== "sales-copilot",
  );
  return profile.experience.map((job, index) => (
    <JobWidget
      key={job.id}
      job={job}
      lang={lang}
      extra={
        index === 0 ? (
          <>
            {otherWork.map((project) => (
              <div key={project.id} className="mt-8">
                <h3 className="font-medium">
                  {interpolate(dict.chat.answers.experience.alsoAt, {
                    company: t(job.company, lang),
                  })}
                  : {t(project.name, lang)}
                  {project.year ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      ({formatPartialDate(project.year, lang)})
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {t(project.description, lang)}
                </p>
              </div>
            ))}
            <TopicLink lang={lang} topic="sales-copilot" />
          </>
        ) : null
      }
    />
  ));
}

/* ---------------------------------------------------------- Sales Copilot */

function salesCopilotBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.salesCopilot;
  const labels = dict.work.labels;
  const project = profile.projects.find((p) => p.id === "sales-copilot");
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );
  if (!project) return [];
  const layers = [a.layers.frontEnd, a.layers.aiTools, a.layers.backEnd];

  return [
    <Widget key="award">
      <h2 className="text-heading">
        {award ? t(award.title, lang) : t(project.award ?? "", lang)}
      </h2>
      {award ? (
        <p className="mt-1 text-lead text-muted-foreground">{award.issuer}</p>
      ) : null}
      <Facts
        className="mt-8"
        items={[
          { label: a.company, value: project.context },
          ...(project.year
            ? [
                {
                  label: a.year,
                  value: formatPartialDate(project.year, lang),
                },
              ]
            : []),
          ...(project.role
            ? [{ label: a.role, value: t(project.role, lang) }]
            : []),
          ...(project.isPrivate
            ? [{ label: a.access, value: labels.privateProject }]
            : []),
        ]}
      />
    </Widget>,
    <Widget key="layers">
      <h2 className="text-lead font-medium">{a.builtBy}</h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-3">
        {layers.map((layer) => (
          <li key={layer.title}>
            <h3 className="font-medium">{layer.title}</h3>
            <p className="mt-1 text-muted-foreground">{layer.body}</p>
          </li>
        ))}
      </ul>
      <TagList
        items={project.stack}
        label={labels.stack}
        tone="surface"
        className="mt-8"
      />
      <TopicLink lang={lang} topic="experience" />
    </Widget>,
  ];
}

/* --------------------------------------------------------- Certifications */

function certificationBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.certifications;
  const labels = dict.work.labels;
  const credentials = getCertifications("certification");
  const courses = getCertifications("course");

  return [
    <Widget key="credentials">
      <h2 className="sr-only">{a.credentials}</h2>
      <ul className="space-y-8">
        {credentials.map((cert) => (
          <li key={cert.id}>
            <h3 className="text-lead font-medium">{t(cert.name, lang)}</h3>
            <p className="mt-1 text-small text-muted-foreground">
              {[
                cert.issuer,
                cert.level === "Expert" ? labels.expertLevel : cert.level,
                cert.date
                  ? interpolate(a.issued, {
                      date: formatPartialDate(cert.date, lang),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {cert.description ? (
              <p className="mt-3">{t(cert.description, lang)}</p>
            ) : null}
            {cert.credentialUrl ? (
              <TextLink
                href={cert.credentialUrl}
                newTabLabel={dict.a11y.opensInNewTab}
                className="mt-3"
              >
                {labels.viewCredential}
              </TextLink>
            ) : null}
          </li>
        ))}
      </ul>
    </Widget>,
    <Widget key="courses">
      <h2 className="text-lead font-medium">{a.courses}</h2>
      <ul className="mt-4 grid gap-5">
        {courses.map((course) => (
          <li key={course.id}>
            <p className="font-medium">{t(course.name, lang)}</p>
            <p className="mt-0.5 text-small text-muted-foreground">
              {course.issuer}
              {course.date ? `, ${formatPartialDate(course.date, lang)}` : ""}
            </p>
            {course.description ? (
              <p className="mt-1 text-small text-muted-foreground">
                {t(course.description, lang)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Widget>,
  ];
}

/* ----------------------------------------------------------------- Skills */

function skillBlocks(lang: Locale): Blocks {
  return [
    <Widget key="skills" className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {profile.skills.map((group) => (
        <div key={group.id}>
          <h2 className="font-medium">{t(group.title, lang)}</h2>
          <TagList items={group.skills} tone="surface" className="mt-3" />
        </div>
      ))}
    </Widget>,
  ];
}

/* -------------------------------------------------------------- Education */

function educationBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const labels = dict.work.labels;
  const a = dict.chat.answers.education;

  return [
    ...profile.education.map((edu) => (
      <Widget key={edu.id}>
        <h2 className="text-heading">{t(edu.field, lang)}</h2>
        <p className="mt-1 text-lead">
          {edu.url ? (
            <TextLink href={edu.url} arrow={false}>
              {t(edu.institution, lang)}
            </TextLink>
          ) : (
            t(edu.institution, lang)
          )}
          {edu.shortName ? ` (${edu.shortName})` : null}
        </p>
        <Facts
          className="mt-8"
          items={[
            { label: a.degree, value: t(edu.degree, lang) },
            { label: a.location, value: t(edu.location, lang) },
            ...(edu.thesis
              ? [
                  {
                    label: labels.thesis,
                    value: edu.thesis.year
                      ? formatPartialDate(edu.thesis.year, lang)
                      : "",
                  },
                ]
              : []),
          ]}
        />
        {edu.thesis ? (
          <p className="mt-6">
            {edu.thesis.title ? (
              <span className="font-medium">{t(edu.thesis.title, lang)}. </span>
            ) : null}
            {t(edu.thesis.description, lang)}
          </p>
        ) : null}
        <h3 className="mt-8 font-medium">{labels.coursework}</h3>
        <TagList
          items={t(edu.coursework, lang)}
          tone="surface"
          className="mt-3"
        />
      </Widget>
    )),
    <Widget key="languages">
      <h2 className="text-lead font-medium">{labels.languagesSpoken}</h2>
      <Facts
        className="mt-4"
        items={profile.languages.map((language) => ({
          label: t(language.name, lang),
          value: t(language.level, lang),
        }))}
      />
    </Widget>,
  ];
}

/* -------------------------------------------------------------------- FAQ */

function faqBlocks(lang: Locale): Blocks {
  return [
    <div key="faq" className="space-y-10">
      {profile.faq.map((item) => (
        <div key={item.id} id={item.id} className="scroll-mt-8">
          <h2 className="text-lead font-medium">{t(item.question, lang)}</h2>
          <p className="mt-2 max-w-[66ch]">{t(item.answer, lang)}</p>
        </div>
      ))}
    </div>,
  ];
}

/* ---------------------------------------------------------------- Contact */

function contactBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.contact;
  const linkedin = getSocial("linkedin");
  const github = getSocial("github");

  return [
    <Widget key="email">
      {profile.availability.open ? (
        <>
          <h2 className="text-lead font-medium">
            {dict.work.hero.availability}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {t(profile.availability.modes, lang)}
          </p>
        </>
      ) : null}
      <p className="mt-8 text-heading break-all sm:break-normal">
        <a href={`mailto:${profile.email}`} className="link-underline">
          {profile.email}
        </a>
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={`mailto:${profile.email}`} variant="accent" size="lg">
          {a.emailCta}
        </ButtonLink>
        <CopyEmailButton
          email={profile.email}
          label={a.copyEmail}
          copiedLabel={a.copied}
          variant="raised"
        />
      </div>
    </Widget>,
    <Widget key="elsewhere">
      <h2 className="text-lead font-medium">{a.elsewhere}</h2>
      <Facts
        className="mt-4"
        items={[
          {
            label: dict.socials.linkedin,
            value: (
              <TextLink
                href={linkedin.url}
                newTabLabel={dict.a11y.opensInNewTab}
              >
                {linkedin.handle}
              </TextLink>
            ),
          },
          {
            label: dict.socials.github,
            value: (
              <TextLink href={github.url} newTabLabel={dict.a11y.opensInNewTab}>
                {github.handle}
              </TextLink>
            ),
          },
          {
            label: a.timezone,
            value: `${t(profile.location.label, lang)} (${timezoneOffset(lang)})`,
          },
        ]}
      />
    </Widget>,
  ];
}

/** The answer blocks for a topic, in reading order. */
export function topicBlocks(topic: TopicId, lang: Locale): Blocks {
  switch (topic) {
    case "experience":
      return experienceBlocks(lang);
    case "sales-copilot":
      return salesCopilotBlocks(lang);
    case "certifications":
      return certificationBlocks(lang);
    case "skills":
      return skillBlocks(lang);
    case "education":
      return educationBlocks(lang);
    case "faq":
      return faqBlocks(lang);
    case "contact":
      return contactBlocks(lang);
  }
}
