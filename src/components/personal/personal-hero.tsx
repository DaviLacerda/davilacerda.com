import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Emphasis } from "@/components/personal/emphasis";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { profile } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { routes } from "@/lib/routes";

/** Anchors of the sections below the hero, in page order. */
export const personalSectionIds = {
  writing: "blog",
  sideProjects: "side-projects",
  elsewhere: "elsewhere",
} as const;

/** Personal tab intro: h1, first-person paragraphs, quick facts and in-page links. */
export function PersonalHero({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const intro = dict.personal.intro;
  const sections = dict.personal.sections;
  const [lead, ...rest] = intro.paragraphs.map((paragraph) =>
    interpolate(paragraph, { city: profile.location.city }),
  );

  const jumpLinks = [
    { id: personalSectionIds.writing, label: sections.writing.eyebrow },
    {
      id: personalSectionIds.sideProjects,
      label: sections.sideProjects.title,
    },
    { id: personalSectionIds.elsewhere, label: sections.elsewhere.eyebrow },
  ];

  return (
    <section
      aria-labelledby="personal-title"
      className="pt-14 pb-8 sm:pt-24 sm:pb-12"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16 xl:gap-24">
          <div>
            <Eyebrow className="animate-fade-in">{intro.eyebrow}</Eyebrow>
            <h1
              id="personal-title"
              className="mt-6 animate-fade-up font-display text-display text-foreground"
              style={{ animationDelay: "60ms" }}
            >
              <Emphasis text={intro.headline} />
              <span className="text-accent">.</span>
            </h1>

            <div
              className="mt-10 max-w-2xl animate-fade-up space-y-5"
              style={{ animationDelay: "140ms" }}
            >
              {lead ? (
                <p className="text-lead text-foreground">{lead}</p>
              ) : null}
              {rest.map((paragraph) => (
                <p key={paragraph} className="text-muted-foreground sm:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>

            <nav
              aria-label={intro.jumpTo}
              className="mt-10 flex animate-fade-up flex-wrap items-center gap-x-3 gap-y-3"
              style={{ animationDelay: "220ms" }}
            >
              <span
                aria-hidden="true"
                className="mr-1 font-mono text-eyebrow text-muted-foreground uppercase"
              >
                {intro.jumpTo}
              </span>
              <ul className="flex flex-wrap gap-2">
                {jumpLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className="inline-flex h-8 items-center rounded-full border border-border bg-surface/70 px-3.5 text-sm text-muted-foreground transition-colors duration-200 hover:border-border-strong hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <FactsCard lang={lang} />
        </div>
      </Container>
    </section>
  );
}

function FactsCard({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const facts = dict.personal.intro.facts;

  const rows = [
    {
      label: facts.location,
      value: `${profile.location.city}, ${profile.location.regionCode}, ${t(profile.location.country, lang)}`,
    },
    {
      label: facts.dayJob,
      value: (
        <Link
          href={routes.work(lang)}
          className="group inline-flex items-center gap-1.5"
        >
          <span className="link-underline">
            {interpolate(facts.dayJobValue, {
              role: t(profile.headline, lang),
              company: profile.currentEmployer.name,
            })}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 text-muted-foreground transition-transform duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </Link>
      ),
    },
    { label: facts.writingAbout, value: facts.writingTopics },
    {
      label: facts.languages,
      value: profile.languages
        .map((language) => t(language.name, lang))
        .join(", "),
    },
  ];

  return (
    <aside
      aria-labelledby="facts-title"
      className="animate-fade-up self-start lg:mt-28"
      style={{ animationDelay: "260ms" }}
    >
      <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-surface/80 p-6 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 -z-10 size-56 rounded-full bg-accent/10 blur-3xl"
        />
        <p
          id="facts-title"
          className="font-mono text-eyebrow text-muted-foreground uppercase"
        >
          {facts.label}
        </p>
        <dl className="mt-4 divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="py-3.5 first:pt-0 last:pb-0">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {row.label}
              </dt>
              <dd className="mt-1 text-[0.9375rem] text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
