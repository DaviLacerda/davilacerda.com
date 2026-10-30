import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BrowserIcon } from "@phosphor-icons/react/dist/ssr/Browser";
import { DatabaseIcon } from "@phosphor-icons/react/dist/ssr/Database";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";

import { Piece } from "@/components/chat/piece";
import { DemoVideo } from "@/components/projects/demo-video";
import { AsciiBackdrop } from "@/components/ui/ascii-backdrop";
import { ButtonLink } from "@/components/ui/button";
import { LogoTile } from "@/components/ui/logo";
import { TagList } from "@/components/ui/tag";
import { profile } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";
import { projectDemo } from "@/lib/projects";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { splitCompanyName } from "@/lib/work/answers";

import { BlockTitle, fit, Panel } from "./parts";
import { PressList } from "./press";

/**
 * Sales Copilot: the demo first, playing, when its files exist; then the
 * award, as large as the canvas allows, on the ink
 * panel; then the project's four facts in large type; then how it was built,
 * drawn as its three layers with the AI tools in the middle; then the press
 * that covered it.
 */
export function SalesCopilotAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.salesCopilot;
  const labels = dict.work.labels;
  const project = profile.projects.find((p) => p.id === "sales-copilot");
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );
  if (!project) return null;
  const demo = projectDemo(project.id);
  const employer = profile.experience.find(
    (job) => splitCompanyName(t(job.company, lang)).short === project.context,
  );
  const awardTitle = award
    ? t(award.title, lang)
    : project.award
      ? t(project.award, lang)
      : "";

  const facts = [
    project.context
      ? {
          label: a.company,
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
      ? { label: a.year, value: formatPartialDate(project.year, lang) }
      : null,
    project.role ? { label: a.role, value: t(project.role, lang) } : null,
    project.isPrivate
      ? { label: a.access, value: labels.privateProject }
      : null,
  ].filter((fact) => fact !== null);

  const layers = [
    { ...a.layers.frontEnd, Icon: BrowserIcon, core: false },
    { ...a.layers.aiTools, Icon: SparkleIcon, core: true },
    { ...a.layers.backEnd, Icon: DatabaseIcon, core: false },
  ];

  return (
    <>
      {demo ? (
        <Piece i={2} className="mt-10">
          <DemoVideo
            demo={demo}
            label={interpolate(dict.projects.demo, {
              name: t(project.name, lang),
            })}
          />
        </Piece>
      ) : null}

      {awardTitle ? (
        <Piece i={2} className={demo ? "mt-4" : "mt-10"}>
          <Panel
            as="section"
            tone="ink"
            aria-labelledby="award-title"
            className="relative isolate flex min-h-[19rem] flex-col justify-between gap-16 overflow-hidden sm:min-h-[25rem] sm:p-10"
          >
            <AsciiBackdrop scene="copilot" tone="ink" clear />
            <p className="flex items-center justify-between gap-4 text-small text-on-ink-muted">
              <span className="inline-flex items-center gap-2.5">
                <TrophyIcon aria-hidden="true" className="size-6 text-on-ink" />
                {labels.award}
              </span>
              {award?.issuer ? (
                <span>
                  {award.issuer}
                  {award.date ? (
                    <>
                      {", "}
                      <time dateTime={toIsoDate(award.date)}>
                        {formatPartialDate(award.date, lang)}
                      </time>
                    </>
                  ) : null}
                </span>
              ) : null}
            </p>
            <div className="@container">
              <h2
                id="award-title"
                className="leading-[0.95] tracking-[-0.05em] text-balance"
                style={fit(awardTitle, { max: 6.5, min: 1.75 })}
              >
                {awardTitle}
              </h2>
            </div>
          </Panel>
        </Piece>
      ) : null}

      <Piece i={3} className="mt-12">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-small text-muted-foreground">{fact.label}</dt>
              <dd className="mt-2 text-heading font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
        {project.story ? (
          <ButtonLink
            href={routes.project(lang, project.id)}
            variant="quiet"
            className="mt-10"
          >
            {dict.projects.open}
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </ButtonLink>
        ) : null}
      </Piece>

      <Piece
        i={4}
        as="section"
        className="mt-14"
        aria-labelledby="layers-title"
      >
        <BlockTitle id="layers-title">{a.builtBy}</BlockTitle>
        <ul className="mt-5 grid gap-1.5">
          {layers.map(({ title, Icon, core }) => (
            <li
              key={title}
              className={cn(
                "flex h-16 items-center gap-4 rounded-2xl px-5 sm:h-[4.5rem] sm:px-6",
                core ? "bg-ink text-on-ink" : "bg-surface",
              )}
            >
              <Icon aria-hidden="true" className="size-6 shrink-0" />
              <span className="text-lead font-medium">{title}</span>
            </li>
          ))}
        </ul>
        <TagList
          items={project.stack}
          label={labels.stack}
          logos
          className="mt-6"
        />
      </Piece>

      {project.press?.length ? (
        <Piece
          i={5}
          as="section"
          className="mt-14"
          aria-labelledby="press-title"
        >
          <BlockTitle id="press-title">
            {dict.chat.answers.press.title}
          </BlockTitle>
          <PressList items={project.press} lang={lang} className="mt-5" />
        </Piece>
      ) : null}
    </>
  );
}
