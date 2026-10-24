import { GraduationCap } from "lucide-react";

import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";

import { DateRange } from "./date-range";
import { WorkSection } from "./work-section";

/** Education (UFU) and spoken languages, side by side on desktop. */
export function EducationSection({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const labels = dict.work.labels;

  return (
    <WorkSection id="education" title={dict.work.page.education.title}>
      <div className="grid gap-12 md:grid-cols-3 md:gap-10">
        <div className="space-y-12 md:col-span-2">
          {profile.education.map((item) => {
            const titleId = `education-${item.id}-title`;
            const institution = t(item.institution, lang);
            return (
              <article key={item.id} aria-labelledby={titleId}>
                <span className="grid size-11 place-items-center rounded-full border border-border bg-surface text-accent">
                  <GraduationCap
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={1.5}
                  />
                </span>
                <h3
                  id={titleId}
                  className="mt-6 font-display text-h3 text-foreground"
                >
                  {item.url ? (
                    <TextLink
                      href={item.url}
                      newTabLabel={dict.a11y.opensInNewTab}
                      arrow={false}
                    >
                      {institution}
                    </TextLink>
                  ) : (
                    institution
                  )}
                  {item.shortName ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({item.shortName})
                    </span>
                  ) : null}
                </h3>
                <p className="mt-2 text-foreground">
                  {t(item.degree, lang)}, {t(item.field, lang)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(item.location, lang)}
                  {item.start || item.end !== undefined ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="mx-2 text-border-strong"
                      >
                        /
                      </span>
                      <DateRange
                        start={item.start}
                        end={item.end}
                        lang={lang}
                      />
                    </>
                  ) : null}
                </p>

                {item.thesis ? (
                  <p className="mt-5 max-w-xl text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {labels.thesis}:
                    </span>{" "}
                    {item.thesis.title
                      ? `${t(item.thesis.title, lang)}. `
                      : null}
                    {t(item.thesis.description, lang)}
                  </p>
                ) : null}

                {item.coursework[lang].length ? (
                  <div className="mt-6">
                    <h4 className="text-xs text-muted-foreground">
                      {labels.coursework}
                    </h4>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {item.coursework[lang].map((course) => (
                        <li key={course}>
                          <Tag className="px-3 py-1 text-[0.78rem]">
                            {course}
                          </Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground">
            {labels.languagesSpoken}
          </h3>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {profile.languages.map((language) => (
              <li
                key={language.code}
                className="flex items-baseline justify-between gap-4 py-4"
              >
                <span className="font-display text-[1.625rem] leading-none text-foreground">
                  {t(language.name, lang)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(language.level, lang)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </WorkSection>
  );
}
