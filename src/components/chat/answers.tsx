import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BrowserIcon } from "@phosphor-icons/react/dist/ssr/Browser";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { DatabaseIcon } from "@phosphor-icons/react/dist/ssr/Database";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";
import type { ReactNode } from "react";

import { AskLink } from "@/components/chat/ask-link";
import { CopyEmailButton } from "@/components/chat/copy-email-button";
import { ButtonLink } from "@/components/ui/button";
import { SocialList } from "@/components/personal/elsewhere";
import { LogoTile } from "@/components/ui/logo";
import { TagList } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { getCertifications, profile, type Experience } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatDateRange, formatPartialDate, toIsoDate } from "@/i18n/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  splitCompanyName,
  timezoneOffset,
  topicCopy,
} from "@/lib/work/answers";
import type { TopicId } from "@/lib/work/topics";

/*
 * The predefined "generative UI" of each Work topic: the blocks rendered
 * under the answer's one-sentence intro. Every block is server-rendered HTML
 * built from `src/content/profile.ts`, set on the page (no panels): a logo
 * tile and a name for each company, school or credential, tags with brand
 * logos for stacks, and disclosures for the longer lists. The topic page
 * reveals them as one chat turn. Third person: the assistant speaks about
 * Davi.
 */

type Blocks = ReactNode[];

/** A sub-heading inside an answer. */
function BlockTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lead font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

/** A picture (logo tile) beside its text: the row every entry uses. */
function Entry({
  picture,
  children,
  className,
}: {
  picture: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4 sm:gap-5", className)}>
      {picture}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Small link to another topic, at the foot of an answer. */
function TopicLink({ lang, topic }: { lang: Locale; topic: TopicId }) {
  return (
    <AskLink
      href={routes.topic(lang, topic)}
      className="group inline-flex items-center gap-2 font-medium link-underline"
    >
      {topicCopy(topic, lang).question}
      <ArrowRightIcon
        aria-hidden="true"
        className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
      />
    </AskLink>
  );
}

/** A list folded behind its summary (native <details>, animated in CSS). */
function Disclosure({
  summary,
  children,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("disclosure group", className)}>
      <summary className="inline-flex h-9 pressable items-center gap-1.5 rounded-full bg-surface pr-3 pl-4 text-small font-medium transition-colors duration-150 ease-out hover:bg-surface-strong">
        {summary}
        <CaretDownIcon data-caret="" aria-hidden="true" className="size-4" />
      </summary>
      {children}
    </details>
  );
}

/* ------------------------------------------------------------- Experience */

function JobEntry({
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
  const company = splitCompanyName(t(job.company, lang));
  const highlights = t(job.highlights, lang);

  return (
    <Entry
      picture={<LogoTile logo={job.logo} name={company.short} size="lg" />}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6">
        <h2 className="text-heading">
          {job.companyUrl ? (
            <TextLink href={job.companyUrl} arrow={false}>
              {company.short}
            </TextLink>
          ) : (
            company.short
          )}
        </h2>
        <p className="text-small text-muted-foreground">
          {job.start ? (
            <time dateTime={toIsoDate(job.start)}>{period}</time>
          ) : (
            period
          )}
        </p>
      </div>
      <p className="mt-1 font-medium">{t(job.role, lang)}</p>
      <p className="text-small text-muted-foreground">
        {[company.long, t(job.employmentType, lang), t(job.workModel, lang)]
          .filter(Boolean)
          .join(", ")}
      </p>
      <TagList items={job.stack} label={labels.stack} logos className="mt-4" />
      {highlights.length ? (
        <Disclosure summary={labels.highlights} className="mt-4">
          <ul className="mt-4 max-w-[62ch] list-disc space-y-2 pl-5 marker:text-muted-foreground">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
      {extra}
    </Entry>
  );
}

function experienceBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const otherWork = profile.projects.filter(
    (project) => project.kind === "work" && project.id !== "sales-copilot",
  );
  const copilot = profile.projects.find((p) => p.id === "sales-copilot");
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );

  return profile.experience.map((job, index) => (
    <JobEntry
      key={job.id}
      job={job}
      lang={lang}
      extra={
        index === 0 ? (
          <div className="mt-8">
            <h3 className="font-medium">
              {interpolate(dict.chat.answers.experience.alsoAt, {
                company: splitCompanyName(t(job.company, lang)).short,
              })}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {copilot ? (
                <li>
                  <AskLink
                    href={routes.topic(lang, "sales-copilot")}
                    className="link-underline"
                  >
                    {t(copilot.name, lang)}
                  </AskLink>
                  {award ? (
                    <span className="text-muted-foreground">
                      , {t(award.title, lang)}
                    </span>
                  ) : null}
                </li>
              ) : null}
              {otherWork.map((project) => (
                <li key={project.id}>
                  {t(project.name, lang)}
                  {project.year ? (
                    <span className="text-muted-foreground">
                      {" "}
                      {formatPartialDate(project.year, lang)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
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
  const employer = profile.experience.find(
    (job) => splitCompanyName(t(job.company, lang)).short === project.context,
  );
  const layers = [
    { ...a.layers.frontEnd, Icon: BrowserIcon },
    { ...a.layers.aiTools, Icon: SparkleIcon },
    { ...a.layers.backEnd, Icon: DatabaseIcon },
  ];
  const facts = [
    project.context
      ? {
          label: a.company,
          value: (
            <span className="inline-flex items-center gap-2">
              <LogoTile
                logo={employer?.logo}
                name={project.context}
                size="sm"
              />
              {project.context}
            </span>
          ),
        }
      : null,
    project.year
      ? { label: a.year, value: formatPartialDate(project.year, lang) }
      : null,
    project.role ? { label: a.role, value: t(project.role, lang) } : null,
    project.isPrivate
      ? { label: a.access, value: labels.privateProject }
      : null,
  ].filter((fact) => fact !== null);

  return [
    <div key="award">
      <Entry
        picture={
          <span className="grid size-12 shrink-0 place-items-center rounded-tile bg-surface">
            <TrophyIcon aria-hidden="true" className="size-6" />
          </span>
        }
      >
        <h2 className="text-heading">
          {award ? t(award.title, lang) : t(project.award ?? "", lang)}
        </h2>
        {award?.issuer ? (
          <p className="text-muted-foreground">{award.issuer}</p>
        ) : null}
      </Entry>
      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-small text-muted-foreground">{fact.label}</dt>
            <dd className="mt-1 font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>,
    <div key="layers">
      <BlockTitle>{a.builtBy}</BlockTitle>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {layers.map(({ title, Icon }) => (
          <li key={title} className="inline-flex items-center gap-2">
            <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
            {title}
          </li>
        ))}
      </ul>
      <TagList
        items={project.stack}
        label={labels.stack}
        logos
        className="mt-5"
      />
      <p className="mt-10">
        <TopicLink lang={lang} topic="experience" />
      </p>
    </div>,
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
    // The list is the block itself, so each credential builds in on its own.
    <ul key="credentials" aria-label={a.credentials} className="space-y-6">
      {credentials.map((cert) => {
        const name = t(cert.name, lang);
        // "Microsoft Certified: Multi-Agent AI Solutions Expert": the
        // credential's own name is the title, the program goes in the line under it.
        const [program, title] = name.includes(": ")
          ? (name.split(/: (.*)/s) as [string, string])
          : [cert.issuer, name];
        return (
          <li key={cert.id}>
            <Entry
              picture={
                <LogoTile logo={cert.logo} name={cert.issuer} size="lg" />
              }
            >
              <h2 className="text-lead font-semibold tracking-tight">
                {title}
              </h2>
              <p className="text-small text-muted-foreground">
                {[
                  program,
                  cert.level === "Expert" ? labels.expertLevel : cert.level,
                  cert.date ? formatPartialDate(cert.date, lang) : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {cert.credentialUrl ? (
                <TextLink
                  href={cert.credentialUrl}
                  newTabLabel={dict.a11y.opensInNewTab}
                  className="mt-2 text-small"
                >
                  {labels.viewCredential}
                </TextLink>
              ) : null}
            </Entry>
          </li>
        );
      })}
    </ul>,
    <div key="courses">
      <BlockTitle>{a.courses}</BlockTitle>
      <ul className="mt-5 space-y-4">
        {courses.map((course) => (
          <li key={course.id}>
            <Entry
              className="items-center"
              picture={
                <LogoTile logo={course.logo} name={course.issuer} size="sm" />
              }
            >
              <p className="font-medium">{t(course.name, lang)}</p>
              <p className="text-small text-muted-foreground">
                {course.issuer}
                {course.date ? `, ${formatPartialDate(course.date, lang)}` : ""}
              </p>
            </Entry>
          </li>
        ))}
      </ul>
    </div>,
  ];
}

/* ----------------------------------------------------------------- Skills */

function skillBlocks(lang: Locale): Blocks {
  return [
    <div key="skills" className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {profile.skills.map((group) => (
        <div key={group.id}>
          <h2 className="font-semibold">{t(group.title, lang)}</h2>
          <TagList items={group.skills} logos className="mt-3" />
        </div>
      ))}
    </div>,
  ];
}

/* -------------------------------------------------------------- Education */

function educationBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const labels = dict.work.labels;

  return [
    ...profile.education.map((edu) => (
      <Entry
        key={edu.id}
        picture={
          <LogoTile
            logo={edu.logo}
            name={t(edu.institution, lang)}
            mark={edu.shortName}
            size="lg"
          />
        }
      >
        <h2 className="text-heading">{t(edu.field, lang)}</h2>
        <p className="mt-1 font-medium">
          {edu.url ? (
            <TextLink href={edu.url} arrow={false}>
              {t(edu.institution, lang)}
            </TextLink>
          ) : (
            t(edu.institution, lang)
          )}
        </p>
        <p className="text-small text-muted-foreground">
          {[
            t(edu.degree, lang),
            t(edu.location, lang),
            edu.thesis?.year
              ? `${labels.thesis} ${formatPartialDate(edu.thesis.year, lang)}`
              : null,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
        <TagList
          items={t(edu.coursework, lang)}
          label={labels.coursework}
          className="mt-4"
        />
      </Entry>
    )),
    <div key="languages">
      <BlockTitle>{labels.languagesSpoken}</BlockTitle>
      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        {profile.languages.map((language) => (
          <div key={language.code}>
            <dt className="font-medium">{t(language.name, lang)}</dt>
            <dd className="text-small text-muted-foreground">
              {t(language.level, lang)}
            </dd>
          </div>
        ))}
      </dl>
    </div>,
  ];
}

/* -------------------------------------------------------------------- FAQ */

function faqBlocks(lang: Locale): Blocks {
  return [
    <ul key="faq" className="-mx-4 sm:-mx-5">
      {profile.faq.map((item) => (
        <li key={item.id}>
          <details id={item.id} className="disclosure group scroll-mt-8">
            <summary className="flex items-center justify-between gap-6 rounded-surface px-4 py-3.5 transition-colors duration-150 ease-out hover:bg-surface sm:px-5">
              <h2 className="text-lead font-medium tracking-tight">
                {t(item.question, lang)}
              </h2>
              <CaretDownIcon
                data-caret=""
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </summary>
            <p className="max-w-[62ch] px-4 pt-1 pb-5 sm:px-5">
              {t(item.answer, lang)}
            </p>
          </details>
        </li>
      ))}
    </ul>,
  ];
}

/* ---------------------------------------------------------------- Contact */

function contactBlocks(lang: Locale): Blocks {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.contact;

  return [
    <div key="email">
      <p className="text-heading break-all sm:break-normal">
        <a href={`mailto:${profile.email}`} className="link-underline">
          {profile.email}
        </a>
      </p>
      {profile.availability.open ? (
        <p className="mt-1 text-muted-foreground">
          {t(profile.availability.modes, lang)}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={`mailto:${profile.email}`} variant="accent" size="lg">
          {a.emailCta}
        </ButtonLink>
        <CopyEmailButton
          email={profile.email}
          label={a.copyEmail}
          copiedLabel={a.copied}
        />
      </div>
    </div>,
    <div key="elsewhere">
      <BlockTitle>{a.elsewhere}</BlockTitle>
      <SocialList lang={lang} ids={["linkedin", "github"]} className="mt-3">
        <li className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <ClockIcon
            aria-hidden="true"
            className="size-6 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0">
            <span className="block font-medium">{a.timezone}</span>
            <span className="block text-small text-muted-foreground">
              {t(profile.location.label, lang)}, {timezoneOffset(lang)}
            </span>
          </span>
        </li>
      </SocialList>
    </div>,
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
