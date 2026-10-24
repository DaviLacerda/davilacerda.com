import { TextLink } from "@/components/ui/text-link";
import { Tag } from "@/components/ui/tag";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

import { DateRange } from "./date-range";
import { WorkSection } from "./work-section";

/** Experience as a vertical timeline (newest first), stacks as Tags. */
export function ExperienceTimeline({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const section = dict.work.sections.experience;

  return (
    <WorkSection
      id="experience"
      title={section.title}
      description={section.description}
    >
      <ol className="relative">
        {profile.experience.map((item) => {
          const current = item.end === null;
          const titleId = `experience-${item.id}-title`;
          const company = t(item.company, lang);
          return (
            <li
              key={item.id}
              className="relative pb-14 pl-8 before:absolute before:top-3 before:bottom-0 before:left-[5px] before:w-px before:bg-border last:pb-0 last:before:hidden sm:pl-12"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1.5 left-0 size-[11px] rounded-full border-2",
                  current
                    ? "border-accent bg-accent ring-4 ring-accent/15"
                    : "border-border-strong bg-background",
                )}
              />
              <article aria-labelledby={titleId}>
                <div className="flex flex-wrap items-center gap-3">
                  <DateRange
                    start={item.start}
                    end={item.end}
                    lang={lang}
                    className="font-mono text-xs tracking-wide text-muted-foreground"
                  />
                  {current ? (
                    <Tag tone="accent">{dict.work.page.experience.current}</Tag>
                  ) : null}
                </div>

                <h3
                  id={titleId}
                  className="mt-3 font-display text-h3 text-foreground"
                >
                  {t(item.role, lang)}
                </h3>
                <p className="mt-1.5 text-foreground">
                  {item.companyUrl ? (
                    <TextLink
                      href={item.companyUrl}
                      newTabLabel={dict.a11y.opensInNewTab}
                    >
                      {company}
                    </TextLink>
                  ) : (
                    company
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    t(item.employmentType, lang),
                    t(item.workModel, lang),
                    t(item.location, lang),
                  ].join(", ")}
                </p>

                <p className="mt-5 max-w-2xl text-foreground/90">
                  {t(item.description, lang)}
                </p>

                {item.highlights[lang].length ? (
                  <ul className="mt-5 max-w-2xl space-y-3">
                    {item.highlights[lang].map((highlight) => (
                      <li
                        key={highlight}
                        className="relative pl-6 text-muted-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute top-3 left-0 h-px w-3 bg-accent"
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {item.stack.length ? (
                  <ul
                    aria-label={dict.work.labels.stack}
                    className="mt-6 flex flex-wrap gap-1.5"
                  >
                    {item.stack.map((tech) => (
                      <li key={tech}>
                        <Tag>{tech}</Tag>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </WorkSection>
  );
}
